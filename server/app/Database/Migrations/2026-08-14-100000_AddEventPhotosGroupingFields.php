<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Reworks `events_photos` for the photographer-grouping + EXIF-date-sort
 * gallery feature:
 *
 * - Drops `title_ru`/`title_en` — never surfaced by the API (getPhotoList()
 *   only ever exposed a single localized `title` derived from the event's
 *   own title, never the photo's own bilingual columns) and not used by any
 *   client feature.
 * - Adds `photographer_name` — an optional free-text credit for whoever took
 *   the photo, entered at upload time (not tied to a `users` row, since the
 *   uploader and the photographer are often different people).
 * - Adds `taken_at` — the photo's EXIF capture timestamp, parsed client-side
 *   and sent at upload time. Nullable: not every photo carries EXIF data.
 * - Adds a composite index on (event_id, taken_at) supporting the gallery's
 *   default "sort by capture date within an event" query.
 */
class AddEventPhotosGroupingFields extends Migration
{
    public function up()
    {
        $this->forge->dropColumn('events_photos', ['title_en', 'title_ru']);

        $this->forge->addColumn('events_photos', [
            'photographer_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 200,
                'null'       => true,
                'after'      => 'user_id',
            ],
            'taken_at' => [
                'type'       => 'DATETIME',
                'null'       => true,
                'after'      => 'image_height',
            ],
        ]);

        $this->forge->addKey(['event_id', 'taken_at'], false, false, 'idx_events_photos_event_taken_at');
        $this->forge->processIndexes('events_photos');
    }

    public function down()
    {
        $this->forge->dropKey('events_photos', 'idx_events_photos_event_taken_at');

        $this->forge->dropColumn('events_photos', ['photographer_name', 'taken_at']);

        $this->forge->addColumn('events_photos', [
            'title_en' => [
                'type'       => 'VARCHAR',
                'constraint' => 200,
                'null'       => true,
            ],
            'title_ru' => [
                'type'       => 'VARCHAR',
                'constraint' => 200,
                'null'       => true,
            ],
        ]);
    }
}
