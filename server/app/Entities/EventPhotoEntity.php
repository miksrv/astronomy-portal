<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class EventPhotoEntity extends Entity
{
    // NOTE: `taken_at` is intentionally NOT in $dates. CI4's Entity::__get()
    // mutates any attribute listed in $dates into a Time object unconditionally
    // (bypassing $casts entirely — see Entity::__get()'s dates-vs-cast branch),
    // which serializes over the wire as {date, timezone_type, timezone} — the
    // shape used by every other entity datetime field in this codebase
    // (created_at/updated_at/deleted_at here, plus events.date/endDate/etc.),
    // matched on the frontend by the `DateTime` type. The frontend's
    // `EventPhoto.takenAt` is typed as a plain `string` (EXIF-derived, used for
    // simple chronological sort/display), not `DateTime` — so this field must
    // stay a plain string on output. Cast as '?string' instead, same pattern as
    // UserEntity's `birthday` (also a date-shaped column exposed as a string).
    protected $dates = ['created_at', 'updated_at', 'deleted_at'];

    protected $casts = [
        'file_size'    => 'integer',
        'image_width'  => 'integer',
        'image_height' => 'integer',
        'deleted_at'   => '?datetime',
        'taken_at'     => '?string',
    ];

    protected $datamap = [
        'eventId'      => 'event_id',
        'name'         => 'file_name',
        'ext'          => 'file_ext',
        'width'        => 'image_width',
        'height'       => 'image_height',
        'photographer' => 'photographer_name',
        'takenAt'      => 'taken_at'
    ];
}
