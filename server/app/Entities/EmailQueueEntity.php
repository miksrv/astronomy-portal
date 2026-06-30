<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

/**
 * A single queued transactional email (event ticket, booking cancellation, …).
 *
 * The row is fully rendered at enqueue time: `body` is the final HTML and may
 * contain the `cid:COVER_IMAGE_CID` placeholder that EmailLibrary swaps for the
 * attachment referenced by `attachment_path`.
 */
class EmailQueueEntity extends Entity
{
    const STATUS_QUEUED = 'queued';
    const STATUS_SENT   = 'sent';
    const STATUS_ERROR  = 'error';

    protected $attributes = [
        'id'              => null,
        'email'           => null,
        'subject'         => null,
        'body'            => null,
        'attachment_path' => null,
        'status'          => 'queued',
        'attempts'        => 0,
        'error_message'   => null,
        'sent_at'         => null,
    ];

    protected $dates = [
        'sent_at',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'id'              => 'string',
        'email'           => 'string',
        'subject'         => 'string',
        'body'            => 'string',
        'attachment_path' => '?string',
        'status'          => 'string',
        'attempts'        => 'integer',
        'error_message'   => '?string',
        'sent_at'         => 'datetime',
    ];
}
