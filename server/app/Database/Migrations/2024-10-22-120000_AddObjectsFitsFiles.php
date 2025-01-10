<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateObjectsFitsFilesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'       => 'VARCHAR',
                'constraint' => 40,
                'null'       => false,
                'unique'     => true
            ],
            'file_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 80,
                'null'       => false,
            ],
            'file_size' => [
                'type'       => 'FLOAT',
                'null'       => false,
                'default'    => 0
            ],
            'ypixsz' => [
                'type'    => 'FLOAT',
                'null'    => false,
                'default' => 0
            ],
            'xpixsz' => [
                'type'    => 'FLOAT',
                'null'    => false,
                'default' => 0
            ],
            'naxis1' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => false,
                'default'    => 4656
            ],
            'naxis2' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => false,
                'default'    => 3520
            ],
            'naxis' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => false,
                'default'    => 2
            ],
            'bscale' => [
                'type'       => 'TINYINT',
                'constraint' => 2,
                'null'       => false,
                'default'    => 1
            ],
            'simple' => [
                'type'       => 'VARCHAR',
                'constraint' => 1,
                'null'       => false,
                'default'    => 'T'
            ],
            'bitpix' => [
                'type'       => 'TINYINT',
                'constraint' => 2,
                'null'       => false,
                'default'    => 16
            ],
            'xbinning' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => false,
                'default'    => 1
            ],
            'ybinning' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => false,
                'default'    => 1
            ],
            'exptime' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => false,
                'default'    => 0
            ],
            'frame' => [
                'type'       => 'VARCHAR',
                'constraint' => 40,
                'null'       => false,
                'default'    => 'Light'
            ],
            'aptdia' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => false,
                'default'    => 200
            ],
            'focallen' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => false,
                'default'    => 1000
            ],
            'comment' => [
                'type' => 'TEXT',
                'null' => true
            ],
            'telescop' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true
            ],
            'observer' => [
                'type'       => 'VARCHAR',
                'constraint' => 200,
                'null'       => true
            ],
            'instrume' => [
                'type'       => 'VARCHAR',
                'constraint' => 200,
                'null'       => true
            ],
            'pixsize1' => [
                'type'    => 'FLOAT',
                'null'    => false,
                'default' => 0
            ],
            'pixsize2' => [
                'type'    => 'FLOAT',
                'null'    => false,
                'default' => 0
            ],
            'ccd_temp' => [
                'type'       => 'TINYINT',
                'constraint' => 3,
                'null'       => false,
                'default'    => 0
            ],
            'offset' => [
                'type'       => 'TINYINT',
                'constraint' => 3,
                'null'       => false,
                'default'    => 10
            ],
            'gain' => [
                'type'       => 'SMALLINT',
                'constraint' => 3,
                'null'       => false,
                'default'    => 90
            ],
            'scale' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true
            ],
            'date_obs' => [
                'type' => 'DATETIME',
                'null' => true
            ],
            'equinox' => [
                'type'       => 'VARCHAR',
                'constraint' => 200,
                'null'       => true
            ],
            'filter' => [
                'type'       => 'VARCHAR',
                'constraint' => 40,
                'null'       => false,
                'default'    => 'Luminance'
            ],
            'dec' => [
                'type'    => 'FLOAT',
                'null'    => false,
                'default' => 0
            ],
            'ra' => [
                'type'    => 'FLOAT',
                'null'    => false,
                'default' => 0
            ],
            'objctdec' => [
                'type'       => 'VARCHAR',
                'constraint' => 40,
                'null'       => true
            ],
            'objctra' => [
                'type'       => 'VARCHAR',
                'constraint' => 40,
                'null'       => true
            ],
            'sitelong' => [
                'type' => 'FLOAT',
                'null' => true
            ],
            'sitelat' => [
                'type' => 'FLOAT',
                'null' => true
            ],
            'bzero' => [
                'type'       => 'INT',
                'constraint' => 6,
                'null'       => false,
                'default'    => 32768
            ],
            'extend' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => true
            ],
            'object' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
                'default'    => 'Unknown'
            ],
            'airmass' => [
                'type' => 'FLOAT',
                'null' => true
            ],
            'star_count' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => true
            ],
            'sky_background' => [
                'type' => 'FLOAT',
                'null' => true
            ],
            'devitation' => [
                'type' => 'FLOAT',
                'null' => true
            ],
            'sigma' => [
                'type' => 'FLOAT',
                'null' => true
            ],
            'hfr' => [
                'type' => 'FLOAT',
                'null' => true
            ],
            'fwhm' => [
                'type' => 'FLOAT',
                'null' => true
            ],
            'created_at DATETIME default current_timestamp',
            'updated_at DATETIME default current_timestamp',
            'deleted_at' => [
                'type' => 'DATETIME',
                'null' => true
            ]
        ]);

        $this->forge->addPrimaryKey('id');

        $this->forge->addForeignKey('object', 'objects', 'catalog_name', 'CASCADE', 'CASCADE');

        $this->forge->addKey('date_obs');
        $this->forge->addKey('object');

        $this->forge->createTable('objects_fits_files');
    }

    public function down()
    {
        $this->forge->dropTable('objects_fits_files');
    }
}
