<?php namespace App\Entities;

use CodeIgniter\Entity\Entity;

class Photo extends Entity
{
    protected $attributes = [];

    protected $casts = [
        'id'           => 'integer',
        'author_id'    => 'integer',
        'image_size'   => 'integer',
        'image_width'  => 'integer',
        'image_height' => 'integer',
        'filters'      => 'json'
    ];
}
