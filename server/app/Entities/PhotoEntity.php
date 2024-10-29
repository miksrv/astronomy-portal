<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class PhotoEntity extends Entity
{
    protected $casts = [
        'id'                => 'string',
        'date'              => 'date',
        'author_id'         => 'string',
        'file_name'         => 'string',
        'file_ext'          => 'string',
        'file_size'         => 'integer',
        'image_width'       => 'integer',
        'image_height'      => 'integer',
        'equipment_info'    => 'string',
        'exposures_filters' => 'string',
        'created_at'        => 'datetime',
        'updated_at'        => 'datetime',
        'deleted_at'        => 'datetime',
    ];
}
