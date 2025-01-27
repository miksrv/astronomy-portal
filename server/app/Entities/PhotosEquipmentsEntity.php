<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class PhotosEquipmentsEntity extends Entity
{
    protected $casts = [
        'photo_id'     => 'string',
        'equipment_id' => 'int',
    ];
}
