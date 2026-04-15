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

use App\Entities\MailingEmailEntity;
use App\Entities\MailingEntity;
use App\Libraries\EmailLibrary;
use App\Models\MailingEmailsModel;
use App\Models\MailingsModel;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Exception;

class SendEmail extends BaseCommand
{
    protected $group       = 'system';
    protected $name        = 'system:send-email';
    protected $description = 'Process and send queued newsletter emails';

    private const DAY_EMAIL_LIMIT  = 2000;
    private const HOUR_EMAIL_LIMIT = 500;
    private const BATCH_SIZE       = 50;

    public function run(array $params)
    {
        $mailingEmailsModel = new MailingEmailsModel();
        $mailingsModel      = new MailingsModel();

        // --- Check rate limits before fetching the batch ---
        $dayCount  = $mailingEmailsModel->countSentToday();
        $hourCount = $mailingEmailsModel->countSentThisHour();

        if ($dayCount >= self::DAY_EMAIL_LIMIT) {
            CLI::write(
                'Daily email limit reached (' . self::DAY_EMAIL_LIMIT . '). Skipping until tomorrow.',
                'red'
            );
            return;
        }

        if ($hourCount >= self::HOUR_EMAIL_LIMIT) {
            CLI::write(
                'Hourly email limit reached (' . self::HOUR_EMAIL_LIMIT . '). Skipping until next hour.',
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

        $siteUrl      = rtrim(getenv('app.siteUrl'), '/');
        $apiUrl       = rtrim(getenv('app.baseURL'), '/');
        $emailLibrary = new EmailLibrary();

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
            '  Daily remaining:  ' . (self::DAY_EMAIL_LIMIT  - $dayCount - $sentCount),
            'white'
        );
        CLI::write(
            '  Hourly remaining: ' . (self::HOUR_EMAIL_LIMIT - $hourCount - $sentCount),
            'white'
        );
    }
}
