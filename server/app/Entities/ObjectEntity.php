<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class ObjectEntity extends Entity
{
    protected $casts = [
        'ra'         => 'float',
        'dec'        => 'float',
        'distance'   => '?float',
        'magnitude'  => '?float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => '?datetime',
    ];
}
