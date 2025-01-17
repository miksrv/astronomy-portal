<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class EventEntity extends Entity
{
    protected $attributes = [
        'id'                 => null,
        'title_en'           => null,
        'title_ru'           => null,
        'content_en'         => null,
        'content_ru'         => null,
        'file_image'         => null,
        'max_tickets'        => null,
        'yandex_map_link'    => null,
        'google_map_link'    => null,
        'date'               => null,
        'registration_start' => null,
        'registration_end'   => null,
        'created_at'         => null,
        'updated_at'         => null,
        'deleted_at'         => null,
    ];

    protected $datamap = [
        // 'registrationStart' => 'registration_start',
        // 'registrationEnd'   => 'registration_end',
        // 'availableTickets'  => 'max_tickets',
        'cover'     => 'file_image',
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
