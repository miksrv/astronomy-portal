<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePhotosCategoriesTable extends Migration
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
            'category_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => false,
            ],
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('photo_id', 'photos', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('category_id', 'categories', 'id', 'CASCADE', 'CASCADE');

        $this->forge->createTable('photos_categories');
    }

    public function down()
    {
        $this->forge->dropTable('photos_categories');
    }
}
