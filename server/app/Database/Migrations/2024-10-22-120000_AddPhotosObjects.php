<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePhotosObjectsTable extends Migration
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
            'photo_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
            'object_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('photo_id', 'photos', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('object_id', 'objects', 'catalog_name', 'CASCADE', 'CASCADE');

        $this->forge->createTable('photos_objects');
    }

    public function down()
    {
        $this->forge->dropTable('photos_objects');
    }
}
