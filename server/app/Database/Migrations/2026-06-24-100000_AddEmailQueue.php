<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Generic transactional-email outbox.
 *
 * Unlike `mailing_emails` (which belongs to a campaign and is rendered from the
 * campaign content), each row here is a fully self-contained, already-rendered
 * email: subject + HTML body + an optional file to attach/embed. It lets one-off
 * emails (event tickets, booking cancellations) be queued and dispatched by the
 * `system:send-email` cron instead of blocking the HTTP request with an SMTP send.
 */
class AddEmailQueue extends Migration
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
            'email' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
            'subject' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
            'body' => [
                'type' => 'MEDIUMTEXT',
                'null' => false,
            ],
            // Absolute path to a file attached and embedded as cid:COVER_IMAGE_CID.
            // The cron deletes it once the row reaches a terminal state.
            'attachment_path' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
            ],
            'status' => [
                'type'    => 'ENUM("queued", "sent", "error")',
                'null'    => false,
                'default' => 'queued',
            ],
            'attempts' => [
                'type'       => 'TINYINT',
                'constraint' => 3,
                'null'       => false,
                'default'    => 0,
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
        $this->forge->addKey('status');
        $this->forge->createTable('email_queue');
    }

    public function down()
    {
        $this->forge->dropTable('email_queue');
    }
}
