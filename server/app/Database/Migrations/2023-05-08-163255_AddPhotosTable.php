<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddPhotosTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'SMALLINT',
                'constraint'     => 5,
                'unsigned'       => true,
                'unique'         => true,
                'auto_increment' => true
            ],
            'object' => [
                'type'       => 'VARCHAR',
                'constraint' => 40,
                'null'       => false
            ],
            'date' => [
                'type'       => 'DATE',
                'null'       => true
            ],
            'author_id' => [
                'type'       => 'TINYINT',
                'constraint' => 5,
                'null'       => true
            ],
            'image_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => false
            ],
            'image_ext' => [
                'type'       => 'VARCHAR',
                'constraint' => 5,
                'null'       => false,
                'default'    => 'jpg'
            ],
            'image_size' => [
                'type'       => 'INT',
                'constraint' => 11,
                'null'       => true
            ],
            'image_width' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => true
            ],
            'image_height' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => true
            ],
            'filters'      => [
                'type'       => 'TEXT',
                'null'       => true
            ],
            'created_at DATETIME default current_timestamp',
            'updated_at DATETIME default current_timestamp',
            'deleted_at' => [
                'type' => 'DATETIME',
                'null' => true
            ]
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('object');
        $this->forge->addKey('date');
        $this->forge->createTable('photos');
    }

    public function down()
    {
        $this->forge->dropTable('photos');
    }
}
