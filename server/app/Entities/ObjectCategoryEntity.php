<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class ObjectCategoryEntity extends Entity
{
    protected $casts = [
        'id'          => 'int',
        'object_name' => 'string',
        'category_id' => 'int',
    ];
}
