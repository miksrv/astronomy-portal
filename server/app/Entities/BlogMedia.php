<?php namespace App\Entities;

use CodeIgniter\Entity\Entity;

class BlogMedia extends Entity
{
    protected $casts = [
        'id'            => 'integer',
        'blog_id'       => 'integer',
        'telegram_id'   => 'integer',
        'telegram_date' => 'integer',
        'group_id'      => 'integer',
        'views'         => 'integer',
        'forwards'      => 'integer',
    ];
}
