<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class MailingEntity extends Entity
{
    const STATUS_DRAFT     = 'draft';
    const STATUS_SENDING   = 'sending';
    const STATUS_COMPLETED = 'completed';
    const STATUS_PAUSED    = 'paused';

    protected $attributes = [
        'id'                 => null,
        'subject'            => null,
        'content'            => null,
        'image'              => null,
        'status'             => 'draft',
        'audience_type'      => 'all',
        'audience_event_id'  => null,
        'total_count'        => 0,
        'sent_count'         => 0,
        'error_count'        => 0,
        'created_by'         => null,
        'sent_at'            => null,
    ];

    protected $dates = [
        'sent_at',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'id'                 => 'string',
        'subject'            => 'string',
        'content'            => 'string',
        'image'              => 'string',
        'status'             => 'string',
        'audience_type'      => 'string',
        'audience_event_id'  => 'string',
        'total_count'        => 'int',
        'sent_count'         => 'int',
        'error_count'        => 'int',
        'created_by'         => 'string',
        'sent_at'            => 'datetime',
    ];
}
