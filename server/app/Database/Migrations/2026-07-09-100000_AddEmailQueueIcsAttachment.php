<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds a second, independent attachment slot to `email_queue` for a
 * calendar (.ics) file — sent alongside the existing `attachment_path`
 * (the ticket PNG) on the same row, not embedded via cid.
 */
class AddEmailQueueIcsAttachment extends Migration
{
    public function up()
    {
        $this->forge->addColumn('email_queue', [
            'ics_attachment_path' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
                'after'      => 'attachment_path',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('email_queue', 'ics_attachment_path');
    }
}
