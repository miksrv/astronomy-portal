<?php namespace App\Entities;

use CodeIgniter\Entity\Entity;

class Event extends Entity {
    protected $datamap = [
        'registrationStart' => 'registration_start',
        'registrationEnd'   => 'registration_end'
    ];

    protected $dates   = ['created_at', 'updated_at', 'deleted_at'];

    protected $casts   = [];
}
