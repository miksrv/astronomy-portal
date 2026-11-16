<?php

namespace App\Libraries;

use App\Entities\EmailQueueEntity;
use App\Entities\MailingEmailEntity;
use App\Entities\MailingEntity;
use App\Models\EmailQueueModel;
use App\Models\MailingEmailsModel;
use App\Models\MailingsModel;
use Closure;
use Config\MailingLimits;
use Exception;

/**
 * Drains the two email queues for `system:cron`: the transactional outbox (`email_queue`:
 * tickets, cancellations) and the mailing campaigns (`mailing_emails`, under the
 * {@see MailingLimits} day/hour caps).
 *
 * Each queue is first asked whether it holds anything ({@see EmailQueueModel::hasQueued()}),
 * so an idle minute costs one indexed query per queue: the SMTP client is only built, and
 * the sent-today/this-hour counts only run, when there is something to send.
 */
class EmailQueueProcessor
{
    public const BATCH_SIZE = 50;

    /** Per-run cap for the transactional outbox. */
    public const TRANSACTIONAL_BATCH_SIZE = 50;

    /** Retries before a transactional email is given up on. */
    public const MAX_ATTEMPTS = 3;

    private ?EmailLibrary $mailer = null;

    private Closure $mailerFactory;

    /**
     * @param Closure|null $mailerFactory Builds the mailer when the first email is sent (tests pass a fake)
     */
    public function __construct(
        ?Closure $mailerFactory = null,
        private readonly EmailQueueModel $queueModel = new EmailQueueModel(),
        private readonly MailingEmailsModel $mailingEmailsModel = new MailingEmailsModel(),
        private readonly MailingsModel $mailingsModel = new MailingsModel(),
    ) {
        $this->mailerFactory = $mailerFactory ?? static fn (): EmailLibrary => new EmailLibrary();
    }

    /**
     * Sends a batch of transactional emails. They are user-facing, so the campaign
     * limits never hold them back. Failures are retried up to {@see MAX_ATTEMPTS} times;
     * the attachment files are removed once a row reaches a terminal state.
     *
     * @return array{sent: int, errors: int}|null Null when the queue was empty
     */
    public function processTransactional(): ?array
    {
        if (!$this->queueModel->hasQueued()) {
            return null;
        }

        $sent   = 0;
        $errors = 0;

        foreach ($this->queueModel->getQueuedBatch(self::TRANSACTIONAL_BATCH_SIZE) as $item) {
            /** @var EmailQueueEntity $item */
            try {
                // sendWithAttachment handles null paths (plain email, no CID swap, no ics)
                $this->mailer()->sendWithAttachment(
                    $item->email,
                    $item->subject,
                    $item->body,
                    $item->attachment_path ?: null,
                    $item->ics_attachment_path ?: null,
                    'event.ics'
                );

                $this->queueModel->update($item->id, [
                    'status'  => EmailQueueEntity::STATUS_SENT,
                    'sent_at' => date('Y-m-d H:i:s'),
                ]);

                $this->deleteAttachment($item->attachment_path);
                $this->deleteAttachment($item->ics_attachment_path);
                $sent++;
            } catch (Exception $e) {
                // EmailLibrary::logError() already has the full SMTP dump in email-*.log;
                // keep the shared app log to a short line
                log_message('warning', 'Failed to send transactional email ID {id} to {email}', [
                    'id'    => $item->id,
                    'email' => $item->email,
                ]);

                $attempts = (int) $item->attempts + 1;
                $update   = [
                    'attempts'      => $attempts,
                    'error_message' => substr($e->getMessage(), 0, 500),
                ];

                // Give up after MAX_ATTEMPTS; otherwise it stays queued for the next run
                if ($attempts >= self::MAX_ATTEMPTS) {
                    $update['status'] = EmailQueueEntity::STATUS_ERROR;
                    $this->deleteAttachment($item->attachment_path);
                    $this->deleteAttachment($item->ics_attachment_path);
                }

                $this->queueModel->update($item->id, $update);
                $errors++;
            }
        }

        return ['sent' => $sent, 'errors' => $errors];
    }

    /**
     * Sends a batch of campaign emails, unless the day or hour cap is reached; marks a
     * campaign completed once none of its emails is queued any more.
     *
     * @return array{sent: int, errors: int, limit: string|null, dayLeft: int, hourLeft: int}|null
     *         Null when the queue was empty; `limit` is 'day' or 'hour' when a cap held it back
     */
    public function processMailings(): ?array
    {
        if (!$this->mailingEmailsModel->hasQueued()) {
            return null;
        }

        $dayCount  = $this->mailingEmailsModel->countSentToday();
        $hourCount = $this->mailingEmailsModel->countSentThisHour();
        $limit     = match (true) {
            $dayCount >= MailingLimits::DAY_LIMIT   => 'day',
            $hourCount >= MailingLimits::HOUR_LIMIT => 'hour',
            default                                 => null,
        };

        if ($limit !== null) {
            return [
                'sent'     => 0,
                'errors'   => 0,
                'limit'    => $limit,
                'dayLeft'  => max(0, MailingLimits::DAY_LIMIT - $dayCount),
                'hourLeft' => max(0, MailingLimits::HOUR_LIMIT - $hourCount),
            ];
        }

        $siteUrl  = rtrim((string) getenv('app.siteUrl'), '/');
        $apiUrl   = rtrim((string) getenv('app.baseURL'), '/');
        $sent     = 0;
        $errors   = 0;
        $affected = [];

        foreach ($this->mailingEmailsModel->getQueuedBatch(self::BATCH_SIZE) as $item) {
            /** @var MailingEmailEntity $item */
            $mailingId = $item->mailing_id;
            $mailing   = $this->mailingsModel->find($mailingId);

            if (!$mailing) {
                // Orphaned email row
                $this->mailingEmailsModel->update($item->id, ['status' => MailingEmailEntity::STATUS_REJECTED]);
                continue;
            }

            // The campaign was canceled after this row was fetched: Mailings::cancel() flips
            // the still-queued rows itself, this only catches the ones already in the batch
            if ($mailing->status === MailingEntity::STATUS_CANCELED) {
                $this->mailingEmailsModel->update($item->id, ['status' => MailingEmailEntity::STATUS_CANCELED]);
                continue;
            }

            $affected[$mailingId] = true;

            $body = view('email_newsletter', [
                'subject'        => $mailing->subject,
                'content'        => $mailing->content,
                'imageUrl'       => !empty($mailing->image) ? $apiUrl . '/' . $mailing->image : null,
                'unsubscribeUrl' => $siteUrl . '/unsubscribe?mail=' . $item->id,
                'locale'         => $item->locale ?? 'ru',
            ]);

            try {
                $this->mailer()->send($item->email, $mailing->subject, $body);

                $this->mailingEmailsModel->update($item->id, [
                    'status'  => MailingEmailEntity::STATUS_SENT,
                    'sent_at' => date('Y-m-d H:i:s'),
                ]);

                $sent++;
            } catch (Exception $e) {
                // The SMTP dump is in email-*.log already (EmailLibrary::logError());
                // one short line here, so a bad address doesn't flood the app log
                log_message('warning', 'Failed to send mailing email ID {id} to {email}', [
                    'id'    => $item->id,
                    'email' => $item->email,
                ]);

                $this->mailingEmailsModel->update($item->id, [
                    'status'        => MailingEmailEntity::STATUS_ERROR,
                    'error_message' => substr($e->getMessage(), 0, 500),
                ]);

                $errors++;
            }
        }

        foreach (array_keys($affected) as $mailingId) {
            $this->mailingsModel->updateCounts($mailingId);

            $remaining = $this->mailingEmailsModel
                ->where('mailing_id', $mailingId)
                ->where('status', MailingEmailEntity::STATUS_QUEUED)
                ->countAllResults();

            if ($remaining === 0) {
                $this->mailingsModel->update($mailingId, ['status' => MailingEntity::STATUS_COMPLETED]);
            }
        }

        return [
            'sent'     => $sent,
            'errors'   => $errors,
            'limit'    => null,
            'dayLeft'  => max(0, MailingLimits::DAY_LIMIT - $dayCount - $sent),
            'hourLeft' => max(0, MailingLimits::HOUR_LIMIT - $hourCount - $sent),
        ];
    }

    private function mailer(): EmailLibrary
    {
        return $this->mailer ??= ($this->mailerFactory)();
    }

    private function deleteAttachment(?string $path): void
    {
        if (!empty($path) && is_file($path)) {
            @unlink($path);
        }
    }
}
