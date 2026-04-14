<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class EventUserEntity extends Entity
{
    protected $datamap = [];
    protected $dates   = ['checkin_at', 'created_at', 'updated_at', 'deleted_at'];

    protected $casts = [
        'adults'        => 'integer',
        'children'      => 'integer',
        'children_ages' => 'json',
        'checkin_at'    => '?datetime',
        'deleted_at'    => '?datetime',
    ];
}
