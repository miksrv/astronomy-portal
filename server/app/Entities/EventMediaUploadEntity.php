<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

/**
 * FEAT-26 — bookkeeping row for one in-progress chunked event-media upload.
 * Purely ephemeral: never displayed to a visitor, only read/written by
 * Events::mediaInit()/mediaChunk()/mediaFinalize()/mediaCancel() and the
 * media:cleanup-uploads command. See EventsMediaUploadsModel for the table.
 */
class EventMediaUploadEntity extends Entity
{
    public const STATUS_UPLOADING  = 'uploading';
    public const STATUS_FINALIZING = 'finalizing';
    public const STATUS_COMPLETED  = 'completed';
    public const STATUS_ABORTED    = 'aborted';

    protected $attributes = [
        'id'                  => null,
        'event_id'            => null,
        'user_id'             => null,
        'media_type'          => null,
        'original_file_name'  => null,
        'mime_type'           => null,
        'total_size'          => null,
        'chunk_size'          => null,
        'received_bytes'      => 0,
        'status'              => self::STATUS_UPLOADING,
    ];

    protected $dates = ['created_at', 'updated_at'];

    protected $casts = [
        'id'                 => 'string',
        'event_id'           => 'string',
        'user_id'            => 'string',
        'media_type'         => 'string',
        'original_file_name' => 'string',
        'mime_type'          => 'string',
        'total_size'         => 'integer',
        'chunk_size'         => 'integer',
        'received_bytes'     => 'integer',
        'status'             => 'string',
    ];
}
