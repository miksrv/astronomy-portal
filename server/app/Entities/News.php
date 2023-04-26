<?php namespace App\Entities;

use CodeIgniter\Entity\Entity;

class News extends Entity
{
    protected $casts = [
        'id'  => 'integer'
    ];
}
