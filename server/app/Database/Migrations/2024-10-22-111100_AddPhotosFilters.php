<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePhotosFiltersTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'auto_increment' => true,
                'null'           => false,
                'unsigned'       => true,
            ],
            'photo_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
            'filter' => [
                'type'    => 'ENUM("L", "R", "G", "B", "H", "O", "S", "N")',
                'default' => 'N',
                'null'    => false,
            ],
            'frames_count' => [
                'type'       => 'INT',
                'default'    => 0,
                'null'       => false,
            ],
            'exposure_time' => [
                'type'       => 'FLOAT',
                'default'    => 0,
                'null'       => false,
            ]
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('photo_id', 'photos', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('photos_filters');
    }

    public function down()
    {
        $this->forge->dropTable('photos_filters');
    }
}
