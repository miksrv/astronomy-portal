<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class EventEntity extends Entity
{
    protected $attributes = [
        'id'                 => null,
        'title_en'           => null,
        'title_ru'           => null,
        'location'           => null,
        'address'            => null,
        'latitude'           => null,
        'longitude'          => null,
        'min_age'            => null,
        'content_en'         => null,
        'content_ru'         => null,
        'cover_file_name'    => null,
        'cover_file_ext'     => null,
        'max_tickets'        => null,
        'requires_registration' => null,
        'ticket_price'       => null,
        'date'               => null,
        'end_date'           => null,
        'views'              => null,
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
        'requiresRegistration' => 'requires_registration',
        'ticketPrice'   => 'ticket_price',
        'minAge'        => 'min_age',
        'endDate'       => 'end_date',
        'coverFileName' => 'cover_file_name',
        'coverFileExt'  => 'cover_file_ext',
    ];

    protected $dates   = [
        'date',
        'end_date',
        'registration_start',
        'registration_end',
        'created_at',
        'updated_at',
        'deleted_at'
    ];

    protected $casts   = [
        'date'               => 'datetime',
        'end_date'           => 'datetime',
        'registration_start' => 'datetime',
        'registration_end'   => 'datetime',
        'max_tickets'        => 'int',
        'requires_registration' => 'boolean',
        'ticket_price'       => 'float',
        'latitude'           => '?float',
        'longitude'          => '?float',
        'min_age'            => '?int',
        'views'              => 'int'
    ];
}
