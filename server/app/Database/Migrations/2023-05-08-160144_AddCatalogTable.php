<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddCatalogTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'name' => [
                'type'       => 'VARCHAR',
                'constraint' => 40,
                'null'       => false,
                'unique'     => true
            ],
            'title' => [
                'type'       => 'VARCHAR',
                'constraint' => 200,
                'null'       => true
            ],
            'text' => [
                'type'       => 'TEXT',
                'null'       => true
            ],
            'category' => [
                'type'       => 'TINYINT',
                'constraint' => 2,
                'null'       => false
            ],
            'source_link' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => true
            ],
            'coord_ra' => [
                'type'       => 'FLOAT',
                'null'       => false
            ],
            'coord_dec' => [
                'type'       => 'FLOAT',
                'null'       => false
            ],
            'image' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => true
            ],
            'created_at DATETIME default current_timestamp',
            'updated_at DATETIME default current_timestamp',
            'deleted_at' => [
                'type' => 'DATETIME',
                'null' => true
            ]
        ]);
        $this->forge->addPrimaryKey('name');
        $this->forge->addKey('title');
        $this->forge->createTable('catalog');
    }

    public function down()
    {
        $this->forge->dropTable('catalog');
    }
}
