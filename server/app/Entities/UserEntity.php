<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class UserEntity extends Entity
{
    protected $attributes = [
        'id'         => null,
        'name'       => null,
        'email'      => null,
        'phone'      => null,
        'avatar'     => null,
        'auth_type'  => 'native',
        'roles'      => null,
        'locale'     => 'ru',
        'settings'   => null,
    ];

    protected $dates = [
        'created_at',
        'updated_at',
        'deleted_at',
        'activity_at'
    ];

    protected $casts = [
        'id'            => 'string',
        'name'          => 'string',
        'email'         => 'string',
        'phone'         => '?string',
        'avatar'        => '?string',
        'auth_type'     => '?string',
        'roles'         => 'json-array',
        'locale'        => 'string',
        'settings'      => 'json-array',
        'sex'           => '?string',
        'birthday'      => '?string',
        'service_id'    => '?string',
        'session_token' => '?string',
        'activity_at'   => '?datetime',
        'created_at'    => 'datetime',
        'updated_at'    => 'datetime',
        'deleted_at'    => '?datetime',
    ];
}
