<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class UserEntity extends Entity
{
    protected $attributes = [
        'id'         => null,
        'name'       => null,
        'email'      => null,
        'password'   => null,
        'role'       => 'user',
        'auth_type'  => 'native',
        'locale'     => 'ru',
        'level'      => 1,
        'experience' => 0,
        'reputation' => 0,
        'website'    => null,
        'avatar'     => null,
        'settings'   => null,
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
        'password'    => 'string',
        'role'        => 'string',
        'auth_type'   => 'string',
        'locale'      => 'string',
        'level'       => '?integer',
        'experience'  => 'integer',
        'reputation'  => 'integer',
        'website'     => 'string',
        'avatar'      => 'string',
        'settings'    => 'json',
        'activity_at' => 'datetime',

        'created'  => 'datetime',
        'activity' => 'datetime',
        'updated'  => 'datetime',
    ];
}