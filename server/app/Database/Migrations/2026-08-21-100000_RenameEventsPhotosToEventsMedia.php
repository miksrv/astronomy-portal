<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * FEAT-26 — renames `events_photos` to `events_media` and reshapes it to
 * hold both photos and videos in one chronological gallery feed instead of
 * two separate tables (see features/stargazing-event-video-uploads.md,
 * "Why extend the existing table, not create a second one").
 *
 * - `events_photos` -> `events_media`.
 * - `image_width`/`image_height` -> `width`/`height` — drops the now
 *   inaccurate "image" prefix, since these also describe a video frame's
 *   dimensions, not just a photo's.
 * - + `media_type ENUM('photo', 'video') NOT NULL DEFAULT 'photo'` (after
 *   `user_id`) — every existing row backfills as 'photo' for free via the
 *   column default.
 * - + `duration SMALLINT UNSIGNED NULL` (after `height`) — seconds, video
 *   only, NULL for photos.
 * - `file_size` INT -> BIGINT UNSIGNED — a video may be up to
 *   MEDIA_UPLOAD_MAX_SIZE (2GB), one byte past a signed INT's range.
 *
 * MySQL's RENAME TABLE preserves index names verbatim, so the existing
 * `idx_events_photos_event_taken_at` index survives the table rename
 * unchanged and has to be renamed explicitly. CI4's Forge has no
 * renameIndex()/dropKey()-then-recreate-with-same-definition shortcut for
 * this, so it's done with a raw ALTER TABLE ... RENAME INDEX query instead
 * (dropping and recreating the key would work too, but RENAME INDEX is the
 * one-statement equivalent and keeps the key's original definition intact).
 */
class RenameEventsPhotosToEventsMedia extends Migration
{
    public function up()
    {
        $this->forge->renameTable('events_photos', 'events_media');

        $this->forge->modifyColumn('events_media', [
            'image_width' => [
                'name'       => 'width',
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => false,
            ],
            'image_height' => [
                'name'       => 'height',
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => false,
            ],
            // Widened from INT: a video may be up to MEDIA_UPLOAD_MAX_SIZE
            // (2GB), one byte past what a signed INT can hold.
            'file_size' => [
                'name'     => 'file_size',
                'type'     => 'BIGINT',
                'unsigned' => true,
                'null'     => false,
            ],
        ]);

        $this->forge->addColumn('events_media', [
            'media_type' => [
                'type'    => "ENUM('photo', 'video')",
                'null'    => false,
                'default' => 'photo',
                'after'   => 'user_id',
            ],
            'duration' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'height',
            ],
        ]);

        // The index kept its old name through the table rename above -
        // rename it now to match the new table name.
        $this->db->query('ALTER TABLE events_media RENAME INDEX idx_events_photos_event_taken_at TO idx_events_media_event_taken_at');
    }

    public function down()
    {
        $this->db->query('ALTER TABLE events_media RENAME INDEX idx_events_media_event_taken_at TO idx_events_photos_event_taken_at');

        $this->forge->dropColumn('events_media', ['media_type', 'duration']);

        $this->forge->modifyColumn('events_media', [
            'width' => [
                'name'       => 'image_width',
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => false,
            ],
            'height' => [
                'name'       => 'image_height',
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => false,
            ],
            'file_size' => [
                'name'       => 'file_size',
                'type'       => 'INT',
                'constraint' => 11,
                'null'       => false,
            ],
        ]);

        $this->forge->renameTable('events_media', 'events_photos');
    }
}
