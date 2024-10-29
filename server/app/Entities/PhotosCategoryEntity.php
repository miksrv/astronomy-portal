<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class PhotosCategoryEntity extends Entity
{
    protected $casts = [
        'photo_id'    => 'string',
        'category_id' => 'int',
    ];
}
