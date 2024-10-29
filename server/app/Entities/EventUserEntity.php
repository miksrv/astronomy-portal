<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class EventUserEntity extends Entity
{
    protected $datamap = [];
    protected $dates   = ['created_at', 'updated_at', 'deleted_at'];
    protected $casts   = [
        'children_ages' => 'json'
    ];
}
