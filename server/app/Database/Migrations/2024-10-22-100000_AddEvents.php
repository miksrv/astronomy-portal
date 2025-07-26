<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateEventsTable extends Migration
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
            'title_en' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
                'null'       => true
            ],
            'title_ru' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
                'null'       => true
            ],
            'location_en' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
                'null'       => true
            ],
            'location_ru' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
                'null'       => true
            ],
            'content_en' => [
                'type' => 'TEXT',
                'null' => true
            ],
            'content_ru' => [
                'type' => 'TEXT',
                'null' => true
            ],
            'cover_file_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => true
            ],
            'cover_file_ext' => [
                'type'       => 'VARCHAR',
                'constraint' => 10,
                'null'       => true
            ],
            'max_tickets' => [
                'type'       => 'INT',
                'constraint' => 5,
                'unsigned'   => true
            ],
            'yandex_map_link' => [
                'type'       => 'VARCHAR',
                'constraint' => 70,
                'null'       => true
            ],
            'google_map_link' => [
                'type'       => 'VARCHAR',
                'constraint' => 70,
                'null'       => true
            ],
            'date' => [
                'type' => 'DATETIME',
                'null' => true
            ],
            'registration_start' => [
                'type' => 'DATETIME',
                'null' => true
            ],
            'registration_end' => [
                'type' => 'DATETIME',
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
        $this->forge->createTable('events');
    }

    public function down()
    {
        $this->forge->dropTable('events');
    }
}
