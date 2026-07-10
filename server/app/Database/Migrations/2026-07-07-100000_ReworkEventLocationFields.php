<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Replaces manually-entered map links and the bilingual venue name with
 * structured location data: precise coordinates (used to generate Yandex/Google
 * map links on the fly instead of storing them), a single-language venue name,
 * a free-text address, a minimum age, and an event end time.
 *
 * `location_ru` is backfilled into the new single-language `location` column
 * before the bilingual columns are dropped. `yandex_map_link`/`google_map_link`
 * are not backfilled into coordinates — arbitrary map URLs aren't reliably
 * parseable — so existing events fall back to the default venue coordinates
 * and may need a manual pin correction via the admin form.
 */
class ReworkEventLocationFields extends Migration
{
    // Default venue coordinates (the observatory's usual stargazing field).
    private const DEFAULT_LATITUDE  = '51.8250225';
    private const DEFAULT_LONGITUDE = '55.7107200';

    public function up()
    {
        $this->forge->addColumn('events', [
            'location' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
                'null'       => true,
                'after'      => 'cover_file_ext',
            ],
            'address' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
                'after'      => 'location',
            ],
            'latitude' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,7',
                'null'       => false,
                'default'    => self::DEFAULT_LATITUDE,
                'after'      => 'address',
            ],
            'longitude' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,7',
                'null'       => false,
                'default'    => self::DEFAULT_LONGITUDE,
                'after'      => 'latitude',
            ],
            'min_age' => [
                'type'       => 'SMALLINT',
                'constraint' => 3,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'longitude',
            ],
            'end_date' => [
                'type'  => 'DATETIME',
                'null'  => true,
                'after' => 'date',
            ],
        ]);

        // Preserve existing venue names before dropping the bilingual columns.
        $this->db->query('UPDATE events SET location = location_ru');

        $this->forge->dropColumn('events', [
            'yandex_map_link',
            'google_map_link',
            'location_en',
            'location_ru',
        ]);
    }

    public function down()
    {
        $this->forge->addColumn('events', [
            'yandex_map_link' => [
                'type'       => 'VARCHAR',
                'constraint' => 70,
                'null'       => true,
            ],
            'google_map_link' => [
                'type'       => 'VARCHAR',
                'constraint' => 70,
                'null'       => true,
            ],
            'location_en' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
                'null'       => true,
            ],
            'location_ru' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
                'null'       => true,
            ],
        ]);

        $this->db->query('UPDATE events SET location_ru = location, location_en = location');

        $this->forge->dropColumn('events', [
            'location',
            'address',
            'latitude',
            'longitude',
            'min_age',
            'end_date',
        ]);
    }
}
