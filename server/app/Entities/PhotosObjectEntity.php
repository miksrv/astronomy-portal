<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class PhotosObjectEntity extends Entity
{
    protected $casts = [
        'photo_id'  => 'string',
        'object_id' => 'string',
    ];
}
