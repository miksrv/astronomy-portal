<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class EventEntity extends Entity
{
    protected $attributes = [
        'id'                 => null,
        'title'              => null,
        'content'            => null,
        'cover'              => null,
        'max_tickets'        => null,
        'date'               => null,
        'yandex_map_link'    => null,
        'google_map_link'    => null,
        'registration_start' => null,
        'registration_end'   => null,
        'created_at'         => null,
        'updated_at'         => null,
        'deleted_at'         => null,
    ];

    protected $datamap = [
        'registrationStart' => 'registration_start',
        'registrationEnd'   => 'registration_end',
        'availableTickets'  => 'max_tickets',
        'yandexMap' => 'yandex_map_link',
        'googleMap' => 'google_map_link',
    ];

    protected $dates   = [
        'date',
        'registration_start',
        'registration_end',
        'created_at',
        'updated_at',
        'deleted_at'
    ];

    protected $casts   = [
        'date'               => 'datetime',
        'registration_start' => 'datetime',
        'registration_end'   => 'datetime'
    ];
}
