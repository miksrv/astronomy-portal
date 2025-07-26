<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class EventUserEntity extends Entity
{
    protected $datamap = [];
    protected $dates   = ['checkin_at', 'created_at', 'updated_at', 'deleted_at'];
    protected $casts   = [
        'children_ages' => 'json'
    ];
}
