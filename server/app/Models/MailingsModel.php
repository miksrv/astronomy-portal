<?php

namespace App\Models;

use App\Entities\MailingEntity;

/**
 * MailingsModel
 *
 * Manages the `mailings` table, which stores email campaign records including
 * subject, content, delivery status, and aggregate sent/error counts. Supports
 * soft deletes and UUID primary keys.
 */
class MailingsModel extends ApplicationBaseModel
{
    protected $table            = 'mailings';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = MailingEntity::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'subject',
        'content',
        'image',
        'status',
        'audience_type',
        'audience_event_id',
        'total_count',
        'sent_count',
        'error_count',
        'created_by',
        'sent_at',
    ];

    // Dates
    protected $useTimestamps = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];

    /**
     * Recalculates sent_count and error_count from the mailing_emails table
     * and persists the updated totals to the mailings row.
     *
     * @param string $mailingId The mailing campaign ID to update.
     * @return void
     */
    public function updateCounts(string $mailingId): void
    {
        $mailingEmailsModel = new MailingEmailsModel();

        $sentCount  = $mailingEmailsModel->countByMailingAndStatus($mailingId, 'sent');
        $errorCount = $mailingEmailsModel->countByMailingAndStatus($mailingId, 'error');

        $this->update($mailingId, [
            'sent_count'  => $sentCount,
            'error_count' => $errorCount,
        ]);
    }
}
