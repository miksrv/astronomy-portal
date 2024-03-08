<?php namespace App\Entities;

use CodeIgniter\Entity\Entity;

class User extends Entity {
    protected $casts = [
        'name'        => 'string',
        'email'       => 'string',
        'avatar'      => 'string',
        'password'    => 'string',
        'locale'      => 'string',
        'activity_at' => 'datetime',
    ];
}
