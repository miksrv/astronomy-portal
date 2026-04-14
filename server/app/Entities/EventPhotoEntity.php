<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class EventPhotoEntity extends Entity
{
    protected $dates = ['created_at', 'updated_at', 'deleted_at'];

    protected $casts = [
        'file_size'    => 'integer',
        'image_width'  => 'integer',
        'image_height' => 'integer',
        'deleted_at'   => '?datetime',
    ];

    protected $datamap = [
        'eventId' => 'event_id',
        'name'    => 'file_name',
        'ext'     => 'file_ext',
        'width'   => 'image_width',
        'height'  => 'image_height'
    ];
}
