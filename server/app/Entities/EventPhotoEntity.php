<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class EventPhotoEntity extends Entity
{
    protected $dates   = ['created_at', 'updated_at', 'deleted_at'];
    protected $casts   = [];

    protected $datamap = [
        'eventId' => 'event_id',
        'name'    => 'file_name',
        'ext'     => 'file_ext',
        'width'   => 'image_width',
        'height'  => 'image_height'
    ];
}
