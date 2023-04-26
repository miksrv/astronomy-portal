<?php namespace App\Entities;

use CodeIgniter\Entity\Entity;

class Blog extends Entity
{
    protected $casts = [
        'id'            => 'integer',
        'telegram_id'   => 'integer',
        'telegram_date' => 'integer',
        'group_id'      => 'integer',
        'views'         => 'integer',
        'forwards'      => 'integer',
        'replies'       => 'integer',
        'reactions'     => 'json',
    ];
}
