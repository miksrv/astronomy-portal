<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class ObjectEntity extends Entity
{
    protected $casts = [
        'ra'         => 'float',
        'dec'        => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];
}
