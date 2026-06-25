<?php

/**
 * Cron command to process the mailing queue.
 *
 * Run manually:
 *   php spark system:send-email
 *
 * Add to cron (runs every minute):
 *   * * * * * cd /path/to/server && php spark system:send-email >> /dev/null 2>&1
 */

namespace App\Commands;

use App\Entities\EmailQueueEntity;
use App\Entities\MailingEmailEntity;
use App\Entities\MailingEntity;
use App\Libraries\EmailLibrary;
use App\Libraries\PaymentLibrary;
use App\Models\EmailQueueModel;
use App\Models\EventsUsersModel;
use App\Models\MailingEmailsModel;
use App\Models\MailingsModel;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Config\MailingLimits;
use Exception;

class SendEmail extends BaseCommand
{
    protected $group       = 'system';
    protected $name        = 'system:send-email';
    protected $description = 'Process and send queued newsletter and transactional emails';

    private const BATCH_SIZE = 50;

    /** Per-run cap for the transactional outbox (tickets, cancellations). */
    private const TRANSACTIONAL_BATCH_SIZE = 50;

    /** Retries before a transactional email is given up on. */
    private const MAX_ATTEMPTS = 3;

    public function run(array $params)
    {
        $emailLibrary = new EmailLibrary();

        // Release seats held by expired, unpaid reservations (the 20-minute
        // payment hold). Runs every minute with the cron, so an abandoned
        // booking frees its seat even when nobody books the same event.
        (new EventsUsersModel())->releaseExpiredPendingByPaymentIds((new PaymentLibrary())->releaseExpired());

        // Transactional emails (tickets, cancellations) are user-facing and must
        // not be held back by campaign rate limits, so drain them first and
        // independently of the newsletter quota.
        $this->processTransactionalQueue($emailLibrary);

        $mailingEmailsModel = new MailingEmailsModel();
        $mailingsModel      = new MailingsModel();

        // --- Check rate limits before fetching the batch ---
        $dayCount  = $mailingEmailsModel->countSentToday();
        $hourCount = $mailingEmailsModel->countSentThisHour();

        if ($dayCount >= MailingLimits::DAY_LIMIT) {
            CLI::write(
                'Daily email limit reached (' . MailingLimits::DAY_LIMIT . '). Skipping until tomorrow.',
                'red'
            );
            return;
        }

        if ($hourCount >= MailingLimits::HOUR_LIMIT) {
            CLI::write(
                'Hourly email limit reached (' . MailingLimits::HOUR_LIMIT . '). Skipping until next hour.',
                'red'
            );
            return;
        }

        // --- Fetch next batch of queued emails ---
        $batch = $mailingEmailsModel->getQueuedBatch(self::BATCH_SIZE);

        if (empty($batch)) {
            CLI::write('No queued emails to process.', 'yellow');
            return;
        }

        $siteUrl = rtrim(getenv('app.siteUrl'), '/');
        $apiUrl  = rtrim(getenv('app.baseURL'), '/');

        // Track statistics and affected campaign IDs
        $sentCount      = 0;
        $errorCount     = 0;
        $affectedMailings = [];

        foreach ($batch as $item) {
            /** @var MailingEmailEntity $item */
            $mailingId = $item->mailing_id;

            // Load parent campaign
            $mailing = $mailingsModel->find($mailingId);

            if (!$mailing) {
                // Orphaned email row — mark rejected
                $mailingEmailsModel->update($item->id, ['status' => MailingEmailEntity::STATUS_REJECTED]);
                continue;
            }

            $affectedMailings[$mailingId] = true;

            // Build unsubscribe URL pointing to the frontend
            $unsubscribeUrl = $siteUrl . '/unsubscribe?mail=' . $item->id;

            // Build public URL for the image hosted on the API server
            $imageUrl = null;

            if (!empty($mailing->image)) {
                $imageUrl = $apiUrl . '/' . $mailing->image;
            }

            // Render the email HTML template
            $body = view('email_newsletter', [
                'subject'        => $mailing->subject,
                'content'        => $mailing->content,
                'imageUrl'       => $imageUrl,
                'unsubscribeUrl' => $unsubscribeUrl,
                'locale'         => $item->locale ?? 'ru',
            ]);

            try {
                $emailLibrary->send(
                    $item->email,
                    $mailing->subject,
                    $body
                );

                $mailingEmailsModel->update($item->id, [
                    'status'  => MailingEmailEntity::STATUS_SENT,
                    'sent_at' => date('Y-m-d H:i:s'),
                ]);

                $sentCount++;
            } catch (Exception $e) {
                log_message('error', 'SendEmail command error for mail ID ' . $item->id . ': {exception}', ['exception' => $e]);

                $mailingEmailsModel->update($item->id, [
                    'status'        => MailingEmailEntity::STATUS_ERROR,
                    'error_message' => substr($e->getMessage(), 0, 500),
                ]);

                $errorCount++;
            }
        }

        // --- Update counts and check for completion ---
        foreach (array_keys($affectedMailings) as $mailingId) {
            $mailingsModel->updateCounts($mailingId);

            // If no more queued emails remain for this campaign, mark as completed
            $remaining = $mailingEmailsModel
                ->where('mailing_id', $mailingId)
                ->where('status', MailingEmailEntity::STATUS_QUEUED)
                ->countAllResults();

            if ($remaining === 0) {
                $mailingsModel->update($mailingId, [
                    'status' => MailingEntity::STATUS_COMPLETED,
                ]);

                CLI::write('Campaign ' . $mailingId . ' marked as completed.', 'green');
            }
        }

        // --- Print summary ---
        CLI::write('Email batch processing complete.', 'green');
        CLI::write('  Sent:   ' . $sentCount, 'green');
        CLI::write('  Errors: ' . $errorCount, $errorCount > 0 ? 'red' : 'green');
        CLI::write(
            '  Daily remaining:  ' . (MailingLimits::DAY_LIMIT  - $dayCount - $sentCount),
            'white'
        );
        CLI::write(
            '  Hourly remaining: ' . (MailingLimits::HOUR_LIMIT - $hourCount - $sentCount),
            'white'
        );
    }

    /**
     * Drains the transactional outbox (event tickets, booking cancellations).
     *
     * Each row carries its own rendered subject/body and optional attachment, so
     * sending is uniform. Failures are retried up to {@see MAX_ATTEMPTS} times;
     * the attachment file is removed once the row reaches a terminal state.
     */
    private function processTransactionalQueue(EmailLibrary $emailLibrary): void
    {
        $queueModel = new EmailQueueModel();
        $batch      = $queueModel->getQueuedBatch(self::TRANSACTIONAL_BATCH_SIZE);

        if (empty($batch)) {
            return;
        }

        $sentCount  = 0;
        $errorCount = 0;

        foreach ($batch as $item) {
            /** @var EmailQueueEntity $item */
            try {
                // sendWithAttachment handles a null path (plain email, no CID swap).
                $emailLibrary->sendWithAttachment(
                    $item->email,
                    $item->subject,
                    $item->body,
                    $item->attachment_path ?: null
                );

                $queueModel->update($item->id, [
                    'status'  => EmailQueueEntity::STATUS_SENT,
                    'sent_at' => date('Y-m-d H:i:s'),
                ]);

                $this->deleteAttachment($item->attachment_path);
                $sentCount++;
            } catch (Exception $e) {
                log_message('error', 'Transactional email error for queue ID ' . $item->id . ': {exception}', ['exception' => $e]);

                $attempts = (int) $item->attempts + 1;
                $update   = [
                    'attempts'      => $attempts,
                    'error_message' => substr($e->getMessage(), 0, 500),
                ];

                // Give up after MAX_ATTEMPTS; otherwise leave it queued for retry.
                if ($attempts >= self::MAX_ATTEMPTS) {
                    $update['status'] = EmailQueueEntity::STATUS_ERROR;
                    $this->deleteAttachment($item->attachment_path);
                }

                $queueModel->update($item->id, $update);
                $errorCount++;
            }
        }

        CLI::write('Transactional queue: sent ' . $sentCount . ', errors ' . $errorCount . '.', $errorCount > 0 ? 'red' : 'green');
    }

    /**
     * Removes a queued email's attachment file if it still exists on disk.
     */
    private function deleteAttachment(?string $path): void
    {
        if (!empty($path) && is_file($path)) {
            @unlink($path);
        }
    }
}
