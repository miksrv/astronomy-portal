<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class PhotosAuthorEntity extends Entity
{
    protected $casts = [
        'id'        => 'string',
        'user_id'   => 'string',
        'name'      => 'string',
        'link'      => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];
}
