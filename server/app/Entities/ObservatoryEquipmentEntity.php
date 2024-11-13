<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class ObservatoryEquipmentEntity extends Entity
{
    protected $casts = [
        'id'             => 'int',
        'equipment_type' => 'string',
        'brand'          => 'string',
        'model'          => 'string',
        'specifications' => 'string',
    ];

    protected $datamap = [
        'type' => 'equipment_type',
    ];
}
