<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class EventMediaEntity extends Entity
{
    // NOTE: `taken_at` is intentionally NOT in $dates. CI4's Entity::__get()
    // mutates any attribute listed in $dates into a Time object unconditionally
    // (bypassing $casts entirely — see Entity::__get()'s dates-vs-cast branch),
    // which serializes over the wire as {date, timezone_type, timezone} — the
    // shape used by every other entity datetime field in this codebase
    // (created_at/updated_at/deleted_at here, plus events.date/endDate/etc.),
    // matched on the frontend by the `DateTime` type. The frontend's
    // `EventMedia.takenAt` is typed as a plain `string` (EXIF-derived, used
    // for simple chronological sort/display), not `DateTime` — so this field
    // must stay a plain string on output. Cast as '?string' instead, same
    // pattern as UserEntity's `birthday` (also a date-shaped column exposed
    // as a string).
    protected $dates = ['created_at', 'updated_at', 'deleted_at'];

    protected $casts = [
        'file_size' => 'integer',
        'width'     => 'integer',
        'height'    => 'integer',
        // Video-only — NULL for a photo row, so a plain 'integer' cast would
        // silently turn that NULL into 0, indistinguishable from "a 0-second
        // video" on the wire.
        'duration'   => '?integer',
        'deleted_at' => '?datetime',
        'taken_at'   => '?string',
    ];

    protected $datamap = [
        'eventId'      => 'event_id',
        'mediaType'    => 'media_type',
        'name'         => 'file_name',
        'ext'          => 'file_ext',
        'photographer' => 'photographer_name',
        'takenAt'      => 'taken_at'
        // NOTE: no aliases for `width`/`height` — FEAT-26's rename migration
        // renamed the underlying columns from `image_width`/`image_height`
        // to `width`/`height`, so the wire name now matches the column name
        // directly and no datamap entry is needed (unlike the old
        // EventPhotoEntity, where `width`/`height` aliased `image_width`/
        // `image_height`).
    ];
}
