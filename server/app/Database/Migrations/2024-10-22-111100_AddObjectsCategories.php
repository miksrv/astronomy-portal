<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateObjectsCategoriesTable extends Migration
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
            'category_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => false,
            ],
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('object_name');
        $this->forge->addForeignKey('category_id', 'categories', 'id', 'CASCADE', 'CASCADE');

        $this->forge->createTable('objects_categories');
    }

    public function down()
    {
        $this->forge->dropTable('objects_categories');
    }
}
