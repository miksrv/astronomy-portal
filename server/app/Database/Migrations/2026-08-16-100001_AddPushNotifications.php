<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddPushNotifications extends Migration
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
            'title' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
            'body' => [
                'type' => 'TEXT',
                'null' => false,
            ],
            'icon' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
            ],
            'url' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
            ],
            'status' => [
                'type'    => 'ENUM("draft", "sending", "completed", "paused")',
                'null'    => false,
                'default' => 'draft',
            ],
            'audience_type' => [
                'type'    => 'ENUM("all", "event")',
                'null'    => false,
                'default' => 'all',
            ],
            'audience_event_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
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
        $this->forge->addForeignKey('audience_event_id', 'events', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('push_notifications');
    }

    public function down()
    {
        $this->forge->dropTable('push_notifications');
    }
}
