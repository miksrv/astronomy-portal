<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class ObjectEntity extends Entity
{
    protected $casts = [
        'ra'         => 'float',
        'dec'        => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function getCoordinates()
    {
        return [
            'ra'  => $this->ra,
            'dec' => $this->dec,
        ];
    }

    public function isDeleted()
    {
        return !is_null($this->deleted_at);
    }
}
