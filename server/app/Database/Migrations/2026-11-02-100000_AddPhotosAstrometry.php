<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The plate solve of a photo (nova.astrometry.net), one row per photo: where on the sky the
 * picture looks (`ra`/`dec`, `radius`), its plate scale and rotation, the full WCS solution
 * (TAN + SIP, as JSON) the frontend draws the coordinate grid with, and the catalogue objects
 * the service found (JSON, as returned). `status` is the queue: a photo's upload enqueues it
 * (`pending`), and the editor's browser steps it through `POST /photos/:id/astrometry` until
 * it is final; `php spark photos:solve` does the same for a backfill of the archive.
 */
class AddPhotosAstrometry extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'photo_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 10,
                'null'       => false,
                'default'    => 'pending',
            ],
            'error' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
            ],
            'submission_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'null'       => true,
            ],
            'job_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'null'       => true,
            ],
            // The file that was solved (the `_large` rendition), whose pixels the WCS and the
            // annotations are in
            'solved_width' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => true,
            ],
            'solved_height' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => true,
            ],
            // Degrees
            'ra' => [
                'type' => 'DOUBLE',
                'null' => true,
            ],
            'dec' => [
                'type' => 'DOUBLE',
                'null' => true,
            ],
            'radius' => [
                'type' => 'FLOAT',
                'null' => true,
            ],
            // Arcseconds per pixel of the solved file
            'pixscale' => [
                'type' => 'FLOAT',
                'null' => true,
            ],
            // Degrees, east of north
            'orientation' => [
                'type' => 'FLOAT',
                'null' => true,
            ],
            'parity' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => true,
            ],
            'wcs' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'annotations' => [
                'type' => 'MEDIUMTEXT',
                'null' => true,
            ],
            'solved_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addPrimaryKey('photo_id');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('photo_id', 'photos', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('photos_astrometry');
    }

    public function down()
    {
        $this->forge->dropTable('photos_astrometry');
    }
}
