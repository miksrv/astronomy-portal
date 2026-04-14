<?php

namespace App\Models;

use App\Entities\MailingEntity;

class MailingsModel extends ApplicationBaseModel
{
    protected $table            = 'mailings';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = MailingEntity::class;
    protected $useSoftDeletes   = true;
    protected $useTimestamps    = true;

    protected $allowedFields = [
        'subject',
        'content',
        'image',
        'status',
        'total_count',
        'sent_count',
        'error_count',
        'created_by',
        'sent_at',
    ];

    protected $beforeInsert = ['generateId'];

    /**
     * Recalculate sent_count and error_count from mailing_emails
     * and update the mailings row.
     */
    public function updateCounts(string $mailingId): void
    {
        $db = \Config\Database::connect();

        $sentCount = $db->table('mailing_emails')
            ->where('mailing_id', $mailingId)
            ->where('status', 'sent')
            ->countAllResults();

        $errorCount = $db->table('mailing_emails')
            ->where('mailing_id', $mailingId)
            ->where('status', 'error')
            ->countAllResults();

        $this->update($mailingId, [
            'sent_count'  => $sentCount,
            'error_count' => $errorCount,
        ]);
    }
}
