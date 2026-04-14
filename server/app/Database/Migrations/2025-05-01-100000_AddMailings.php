<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddMailings extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'       => 'VARCHAR',
                'constraint' => 24,
                'null'       => false,
                'unique'     => true,
            ],
            'subject' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
            'content' => [
                'type' => 'TEXT',
                'null' => false,
            ],
            'image' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
            ],
            'status' => [
                'type'    => 'ENUM("draft", "sending", "completed", "paused")',
                'null'    => false,
                'default' => 'draft',
            ],
            'total_count' => [
                'type'    => 'INT',
                'null'    => false,
                'default' => 0,
            ],
            'sent_count' => [
                'type'    => 'INT',
                'null'    => false,
                'default' => 0,
            ],
            'error_count' => [
                'type'    => 'INT',
                'null'    => false,
                'default' => 0,
            ],
            'created_by' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
            ],
            'sent_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'created_at DATETIME default current_timestamp',
            'updated_at DATETIME default current_timestamp',
            'deleted_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('created_by', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('mailings');
    }

    public function down()
    {
        $this->forge->dropTable('mailings');
    }
}
