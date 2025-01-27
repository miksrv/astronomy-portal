<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class PhotosFiltersEntity extends Entity
{
    protected $casts = [
        'photo_id'      => 'string',
        'filter'        => 'string',
        'frames_count'  => 'integer',
        'exposure_time' => 'float'
    ];
}
