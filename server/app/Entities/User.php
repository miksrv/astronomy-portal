<?php namespace App\Entities;

use CodeIgniter\Entity\Entity;

class User extends Entity {
    protected $casts = [
        'id'          => 'string',
        'name'        => 'string',
        'email'       => 'string',
        'phone'       => 'string',
        'password'    => 'string',
        'auth_type'   => 'string',
        'role'        => 'string',
        'locale'      => 'string',
        'avatar'      => 'string',
        'updated_at'  => 'datetime',
        'activity_at' => 'datetime',
    ];
}
