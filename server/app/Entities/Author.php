<?php namespace App\Entities;

use CodeIgniter\Entity\Entity;

class Author extends Entity
{
    protected $casts = [
        'id'  => 'integer'
    ];
}
