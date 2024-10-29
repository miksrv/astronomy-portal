<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class ObservatorySettingsEntity extends Entity
{
    protected $casts = [
        'key'   => 'string',
        'value' => 'string',
    ];
}
