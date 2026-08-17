<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class PushNotificationDeliveryEntity extends Entity
{
    const STATUS_QUEUED   = 'queued';
    const STATUS_SENT     = 'sent';
    const STATUS_ERROR    = 'error';
    const STATUS_REJECTED = 'rejected';

    protected $attributes = [
        'id'              => null,
        'notification_id' => null,
        'subscription_id' => null,
        'user_id'         => null,
        'status'          => 'queued',
        'error_message'   => null,
        'sent_at'         => null,
    ];

    protected $dates = [
        'sent_at',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'id'              => 'string',
        'notification_id' => 'string',
        'subscription_id' => 'string',
        'user_id'         => 'string',
        'status'          => 'string',
        'error_message'   => 'string',
        'sent_at'         => 'datetime',
    ];
}
