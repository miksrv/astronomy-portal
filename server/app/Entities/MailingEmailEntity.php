<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class MailingEmailEntity extends Entity
{
    const STATUS_QUEUED   = 'queued';
    const STATUS_SENT     = 'sent';
    const STATUS_ERROR    = 'error';
    const STATUS_REJECTED = 'rejected';

    protected $attributes = [
        'id'            => null,
        'mailing_id'    => null,
        'user_id'       => null,
        'email'         => null,
        'locale'        => 'ru',
        'status'        => 'queued',
        'error_message' => null,
        'sent_at'       => null,
    ];

    protected $dates = [
        'sent_at',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'id'            => 'string',
        'mailing_id'    => 'string',
        'user_id'       => 'string',
        'email'         => 'string',
        'locale'        => 'string',
        'status'        => 'string',
        'error_message' => 'string',
        'sent_at'       => 'datetime',
    ];
}
