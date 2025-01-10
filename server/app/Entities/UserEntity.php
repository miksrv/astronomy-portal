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
        'role'       => 'user',
        'locale'     => 'ru',
        'locale'     => 'ru',
        'avatar'     => null,
    ];

    protected $dates = [
        'created_at',
        'updated_at',
        'deleted_at',
        'activity_at'
    ];

    protected $casts = [
        'id'          => 'string',
        'name'        => 'string',
        'email'       => 'string',
        'phone'       => 'string',
        'avatar'      => 'string',
        'auth_type'   => 'string',
        'role'        => 'string',
        'locale'      => 'string',
        'sex'         => 'string',
        'birthday'    => 'string',
        'service_id'  => 'string',
        'activity_at' => 'datetime',
        'created'     => 'datetime',
        'activity'    => 'datetime',
        'updated'     => 'datetime',
    ];
}
