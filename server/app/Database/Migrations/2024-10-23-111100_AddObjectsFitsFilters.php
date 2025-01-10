<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateObjectsFitsFiltersTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
                'unique'     => true
            ],
            'object_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
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
            ],
            'files_size' => [
                'type'       => 'FLOAT',
                'default'    => 0,
                'null'       => false,
            ],
            'created_at DATETIME default current_timestamp',
            'updated_at DATETIME default current_timestamp',
            'deleted_at' => [
                'type' => 'DATETIME',
                'null' => true
            ]
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('object_name', 'objects', 'catalog_name', 'CASCADE', 'CASCADE');
        $this->forge->createTable('objects_fits_filters');
    }

    public function down()
    {
        $this->forge->dropTable('objects_fits_filters');
    }
}
