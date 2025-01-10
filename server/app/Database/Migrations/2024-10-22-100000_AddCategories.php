<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCategoriesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
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
            ]
        ]);

        $this->forge->addKey('id', true);
        $this->forge->createTable('categories');
    }

    public function down()
    {
        $this->forge->dropTable('categories');
    }
}
