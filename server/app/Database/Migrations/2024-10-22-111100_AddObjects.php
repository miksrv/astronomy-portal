<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateObjectsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'catalog_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
            'title_en' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
            'title_ru' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
            'description_en' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'description_ru' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'fits_cloud_link' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
            ],
            'image_file' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
            ],
            'ra' => [
                'type' => 'FLOAT',
                'null' => false,
            ],
            'dec' => [
                'type' => 'FLOAT',
                'null' => false,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => false,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'deleted_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('catalog_name', true, true);
        $this->forge->createTable('objects');
    }

    public function down()
    {
        $this->forge->dropTable('objects');
    }
}
