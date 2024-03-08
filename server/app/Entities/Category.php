<?php namespace App\Entities;

use CodeIgniter\Entity\Entity;

class Category extends Entity {
    protected $casts = [
        'id' => 'integer'
    ];
}
