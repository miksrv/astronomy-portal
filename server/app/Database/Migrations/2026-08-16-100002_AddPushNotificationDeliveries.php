<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddPushNotificationDeliveries extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
                'unique'     => true,
            ],
            'notification_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 24,
                'null'       => false,
            ],
            'subscription_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 24,
                'null'       => false,
            ],
            'user_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
            ],
            'status' => [
                'type'    => 'ENUM("queued", "sent", "error", "rejected")',
                'null'    => false,
                'default' => 'queued',
            ],
            'error_message' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'sent_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'created_at DATETIME default current_timestamp',
            'updated_at DATETIME default current_timestamp',
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('notification_id', 'push_notifications', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('subscription_id', 'push_subscriptions', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addKey('status');
        $this->forge->createTable('push_notification_deliveries');
    }

    public function down()
    {
        $this->forge->dropTable('push_notification_deliveries');
    }
}
