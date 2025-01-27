<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class ObjectFitsFiltersEntity extends Entity
{
    protected $casts = [
        'object_name'   => 'string',
        'filter'        => 'string',
        'frames_count'  => 'integer',
        'exposure_time' => 'float',
        'files_size'    => 'float',
    ];
}
