<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

/**
 * Maps a row of the generic `payments` table.
 *
 * `amount` is stored and exposed in the minor currency unit (kopecks).
 * camelCase aliases are exposed via $datamap for the JSON API.
 */
class PaymentEntity extends Entity
{
    protected $attributes = [
        'id'            => null,
        'gateway'       => null,
        'order_number'  => null,
        'order_id'      => null,
        'entity_type'   => null,
        'entity_id'     => null,
        'amount'        => null,
        'currency'      => null,
        'status'        => null,
        'form_url'      => null,
        'error_code'    => null,
        'error_message' => null,
        'paid_at'       => null,
        'expires_at'    => null,
        'created_at'    => null,
        'updated_at'    => null,
        'deleted_at'    => null,
    ];

    protected $datamap = [
        'orderNumber'  => 'order_number',
        'orderId'      => 'order_id',
        'entityType'   => 'entity_type',
        'entityId'     => 'entity_id',
        'formUrl'      => 'form_url',
        'errorCode'    => 'error_code',
        'errorMessage' => 'error_message',
        'paidAt'       => 'paid_at',
        'expiresAt'    => 'expires_at',
    ];

    protected $dates = [
        'paid_at',
        'expires_at',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'amount' => 'integer',
    ];
}
