<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class PhotoEntity extends Entity
{
    protected $casts = [
        'id'             => 'string',
        'date'           => 'string',
        'author_id'      => 'string',
        'file_name'      => 'string',
        'file_ext'       => 'string',
        'file_size'      => 'integer',
        'image_width'    => 'integer',
        'image_height'   => 'integer',
        'created_at'     => 'datetime',
        'updated_at'     => 'datetime',
        'deleted_at'     => 'datetime'
    ];

    // protected $datamap = [
    //     'fileName'    => 'file_name',
    //     'fileExt'     => 'file_ext',
    //     'fileSize'    => 'file_size',
    //     'imageWidth'  => 'image_width',
    //     'imageHeight' => 'image_height'
    // ];
}
