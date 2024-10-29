<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class CategoryEntity extends Entity
{
    protected $casts = [
        'id'             => 'int',
        'title_en'       => 'string',
        'title_ru'       => 'string',
        'description_en' => 'string',
        'description_ru' => 'string',
    ];
}
