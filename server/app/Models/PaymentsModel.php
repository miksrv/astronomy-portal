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
     * Returns ids of payments that are still unpaid and whose hold has expired.
     *
     * @return array<string>
     */
    public function getExpiredPendingIds(): array
    {
        $rows = $this->select('id')
            ->whereIn('status', ['new', 'pending'])
            ->where('expires_at IS NOT NULL')
            ->where('expires_at <', (new Time('now'))->toDateTimeString())
            ->findAll();

        return array_map(static fn ($row) => $row->id, $rows);
    }
}
