<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * What SIMBAD knows about an object (FEAT-31), filled by `php spark objects:simbad` for the
 * existing objects and on `POST /objects` for a new one: the SIMBAD main identifier, the object
 * type (SIMBAD's short code: `G`, `GlC`, `HII`…), the angular size in arcminutes, the other
 * names (JSON list) and when it was looked up. The magnitude goes to the existing column.
 */
class AddObjectsSimbad extends Migration
{
    public function up()
    {
        $this->forge->addColumn('objects', [
            'simbad_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 80,
                'null'       => true,
                'after'      => 'magnitude',
            ],
            'object_type' => [
                'type'       => 'VARCHAR',
                'constraint' => 16,
                'null'       => true,
                'after'      => 'simbad_id',
            ],
            'maj_axis' => [
                'type'  => 'FLOAT',
                'null'  => true,
                'after' => 'object_type',
            ],
            'min_axis' => [
                'type'  => 'FLOAT',
                'null'  => true,
                'after' => 'maj_axis',
            ],
            'aliases' => [
                'type'  => 'TEXT',
                'null'  => true,
                'after' => 'min_axis',
            ],
            'simbad_checked_at' => [
                'type'  => 'DATETIME',
                'null'  => true,
                'after' => 'aliases',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('objects', ['simbad_id', 'object_type', 'maj_axis', 'min_axis', 'aliases', 'simbad_checked_at']);
    }
}
