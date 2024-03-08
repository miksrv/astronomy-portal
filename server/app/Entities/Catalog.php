<?php namespace App\Entities;

use CodeIgniter\Entity\Entity;

class Catalog extends Entity {
    protected $casts = [
        'category'  => 'integer',
        'coord_ra'  => 'float',
        'coord_dec' => 'float',
    ];
}
