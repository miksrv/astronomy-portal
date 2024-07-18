<?php namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class EventMedia extends Migration {
    public function up() {
        $this->forge->addField([
            'id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
                'unique'     => true
            ],
            'event_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
            ],
            'user_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
            ],
            'title' => [
                'type'       => 'VARCHAR',
                'constraint' => 200,
                'null'       => true
            ],
            'filename' => [
                'type'       => 'VARCHAR',
                'constraint' => 200,
                'null'       => false,
            ],
            'extension' => [
                'type'       => 'VARCHAR',
                'constraint' => 200,
                'null'       => false,
            ],
            'filesize' => [
                'type'       => 'INT',
                'constraint' => 11,
                'null'       => false,
            ],
            'width' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
                'null'       => false,
            ],
            'height' => [
                'type'       => 'SMALLINT',
                'constraint' => 5,
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
        $this->forge->addForeignKey('event_id', 'events', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('event_photos');
    }

    public function down() {
        $this->forge->dropTable('event_photos');
    }
}
