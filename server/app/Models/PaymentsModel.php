<?php

namespace App\Models;

use App\Entities\PaymentEntity;
use CodeIgniter\I18n\Time;

/**
 * PaymentsModel
 *
 * Manages the generic `payments` table that backs the acquiring layer. A
 * payment references an arbitrary domain entity via (`entity_type`,
 * `entity_id`). Supports soft deletes and UUID-style string primary keys.
 */
class PaymentsModel extends ApplicationBaseModel
{
    protected $table            = 'payments';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = PaymentEntity::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'gateway',
        'order_number',
        'order_id',
        'entity_type',
        'entity_id',
        'amount',
        'currency',
        'status',
        'form_url',
        'error_code',
        'error_message',
        'paid_at',
        'expires_at',
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    // Validation
    protected $validationRules      = [];
    protected $validationMessages   = [];
    protected $skipValidation       = true;
    protected $cleanValidationRules = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];
    protected $afterInsert    = [];
    protected $beforeUpdate   = [];
    protected $afterUpdate    = [];
    protected $beforeFind     = [];
    protected $afterFind      = [];
    protected $beforeDelete   = [];
    protected $afterDelete    = [];

    /**
     * Finds a payment by its gateway-side order id.
     *
     * @param string $orderId Gateway order id.
     * @return PaymentEntity|null
     */
    public function findByOrderId(string $orderId): ?PaymentEntity
    {
        return $this->where('order_id', $orderId)->first();
    }

    /**
     * Finds a payment by its merchant-side order number.
     *
     * @param string $orderNumber Merchant order number.
     * @return PaymentEntity|null
     */
    public function findByOrderNumber(string $orderNumber): ?PaymentEntity
    {
        return $this->where('order_number', $orderNumber)->first();
    }

    /**
     * Returns payments that are still unpaid, whose hold has expired, and that
     * are old enough to be worth re-checking with the gateway before being
     * force-failed (see {@see \App\Libraries\PaymentLibrary::releaseExpired()}).
     *
     * Capped to a small batch and ordered oldest-first, so a burst of expired
     * holds can't turn a single request into dozens of gateway calls.
     *
     * @param int $limit Max rows to return.
     * @return PaymentEntity[]
     */
    public function getExpiredPending(int $limit = 5): array
    {
        return $this->whereIn('status', ['new', 'pending'])
            ->where('expires_at IS NOT NULL')
            ->where('expires_at <', (new Time('now'))->toDateTimeString())
            // Defensive extra margin on top of the hold's own expiry (in case
            // expires_at is ever misconfigured to something very short), and
            // one more way to keep this batch small.
            ->where('created_at <=', (new Time('now'))->subMinutes(10)->toDateTimeString())
            ->orderBy('expires_at', 'ASC')
            ->limit($limit)
            ->findAll();
    }
}
