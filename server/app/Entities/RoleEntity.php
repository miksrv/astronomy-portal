<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class RoleEntity extends Entity
{
    protected $attributes = [
        'id'          => null,
        'name'        => null,
        'permissions' => null,
    ];

    protected $dates = [
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'id'          => 'int',
        'name'        => 'string',
        'permissions' => 'json-array',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];
}
