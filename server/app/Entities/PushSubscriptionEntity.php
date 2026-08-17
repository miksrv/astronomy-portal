<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class PushSubscriptionEntity extends Entity
{
    protected $attributes = [
        'id'         => null,
        'user_id'    => null,
        'endpoint'   => null,
        'p256dh'     => null,
        'auth_key'   => null,
        'user_agent' => null,
    ];

    protected $dates = [
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'id'         => 'string',
        // Nullable cast (not plain 'string') — a subscription created by a
        // guest (before they log in) has no owning user yet, and a plain
        // 'string' cast would silently turn that null into '', making
        // "is this row still anonymous?" unreliable both in PHP and over
        // the API's JSON response.
        'user_id'    => '?string',
        'endpoint'   => 'string',
        'p256dh'     => 'string',
        'auth_key'   => 'string',
        'user_agent' => 'string',
    ];
}
