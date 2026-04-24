<?php

namespace App\Models;

use App\Entities\MailingEmailEntity;

/**
 * MailingEmailsModel
 *
 * Manages the `mailing_emails` table, which stores individual recipient entries
 * for each mailing campaign. Tracks delivery status, error messages, and send time.
 * Uses UUID primary keys generated via the beforeInsert callback.
 */
class MailingEmailsModel extends ApplicationBaseModel
{
    protected $table            = 'mailing_emails';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = MailingEmailEntity::class;
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'mailing_id',
        'user_id',
        'email',
        'locale',
        'status',
        'error_message',
        'sent_at',
    ];

    // Dates
    protected $useTimestamps = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];

    /**
     * Counts email entries for a given mailing filtered by delivery status.
     *
     * @param string $mailingId The mailing campaign ID.
     * @param string $status    Status value to filter by (e.g. 'sent', 'error', 'queued').
     * @return int Count of matching rows.
     */
    public function countByMailingAndStatus(string $mailingId, string $status): int
    {
        return $this
            ->where('mailing_id', $mailingId)
            ->where('status', $status)
            ->countAllResults();
    }

    /**
     * Returns the next batch of queued emails ordered by creation time ascending.
     *
     * @param int $limit Maximum number of rows to return. Default is 50.
     * @return array Array of MailingEmailEntity objects with status 'queued'.
     */
    public function getQueuedBatch(int $limit = 50): array
    {
        return $this->where('status', 'queued')
                    ->orderBy('created_at', 'ASC')
                    ->findAll($limit);
    }

    /**
     * Counts emails successfully sent in the last 24 hours.
     *
     * @return int Number of emails sent in the past 24 hours.
     */
    public function countSentToday(): int
    {
        return $this->where('status', 'sent')
                    ->where('sent_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)')
                    ->countAllResults();
    }

    /**
     * Counts emails successfully sent in the last hour.
     *
     * @return int Number of emails sent in the past hour.
     */
    public function countSentThisHour(): int
    {
        return $this->where('status', 'sent')
                    ->where('sent_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)')
                    ->countAllResults();
    }
}
