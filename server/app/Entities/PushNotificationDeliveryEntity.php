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
        // Nullable cast — a delivery to an anonymous/guest subscription (see
        // PushNotifications::send()'s "all" audience branch) legitimately has
        // no owning user. A plain 'string' cast would silently turn that
        // null into '', same pitfall as PushSubscriptionEntity::user_id.
        'user_id'         => '?string',
        'status'          => 'string',
        'error_message'   => 'string',
        'sent_at'         => 'datetime',
    ];
}
