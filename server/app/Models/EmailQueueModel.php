<?php

namespace App\Models;

use App\Entities\EmailQueueEntity;

/**
 * EmailQueueModel
 *
 * Outbox for one-off transactional emails. Producers call {@see enqueue()} with
 * an already-rendered subject/body (and optional attachment); the
 * `system:send-email` cron drains the queue and performs the actual SMTP send,
 * so request handlers never block on email delivery.
 *
 * Uses UUID primary keys generated via the beforeInsert callback.
 */
class EmailQueueModel extends ApplicationBaseModel
{
    protected $table            = 'email_queue';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = EmailQueueEntity::class;
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'email',
        'subject',
        'body',
        'attachment_path',
        'status',
        'attempts',
        'error_message',
        'sent_at',
    ];

    // Dates
    protected $useTimestamps = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];

    /**
     * Queues a transactional email for asynchronous delivery.
     *
     * @param string      $email          Recipient address.
     * @param string      $subject        Email subject.
     * @param string      $body           Fully-rendered HTML body (may contain cid:COVER_IMAGE_CID).
     * @param string|null $attachmentPath Absolute path to a file to attach/embed, or null.
     * @return bool True on success.
     */
    public function enqueue(string $email, string $subject, string $body, ?string $attachmentPath = null): bool
    {
        return (bool) $this->insert([
            'email'           => $email,
            'subject'         => $subject,
            'body'            => $body,
            'attachment_path' => $attachmentPath,
            'status'          => EmailQueueEntity::STATUS_QUEUED,
        ]);
    }

    /**
     * Returns the next batch of queued emails, oldest first.
     *
     * @param int $limit Maximum number of rows to return.
     * @return array Array of EmailQueueEntity objects with status 'queued'.
     */
    public function getQueuedBatch(int $limit = 50): array
    {
        return $this->where('status', EmailQueueEntity::STATUS_QUEUED)
                    ->orderBy('created_at', 'ASC')
                    ->findAll($limit);
    }
}
