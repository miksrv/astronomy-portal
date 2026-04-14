<?php

namespace App\Models;

use App\Entities\MailingEmailEntity;

class MailingEmailsModel extends ApplicationBaseModel
{
    protected $table            = 'mailing_emails';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = MailingEmailEntity::class;
    protected $useSoftDeletes   = false;
    protected $useTimestamps    = true;

    protected $allowedFields = [
        'mailing_id',
        'user_id',
        'email',
        'locale',
        'status',
        'error_message',
        'sent_at',
    ];

    protected $beforeInsert = ['generateId'];

    /**
     * Return next batch of queued emails ordered by created_at ASC.
     */
    public function getQueuedBatch(int $limit = 50): array
    {
        return $this->where('status', 'queued')
                    ->orderBy('created_at', 'ASC')
                    ->findAll($limit);
    }

    /**
     * Count emails successfully sent in the last 24 hours.
     */
    public function countSentToday(): int
    {
        return $this->where('status', 'sent')
                    ->where('sent_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)')
                    ->countAllResults();
    }

    /**
     * Count emails successfully sent in the last hour.
     */
    public function countSentThisHour(): int
    {
        return $this->where('status', 'sent')
                    ->where('sent_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)')
                    ->countAllResults();
    }
}
