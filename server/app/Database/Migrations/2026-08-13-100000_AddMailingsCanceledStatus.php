<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds 'canceled' to mailings.status and mailing_emails.status.
 *
 * Lets an admin stop a campaign that is still a draft or mid-send. Canceling a
 * 'sending' campaign also flips its still-queued `mailing_emails` rows to
 * 'canceled' (done in `Mailings::cancel()`), so `system:send-email` — which
 * only ever pulls rows with status = 'queued' — naturally stops delivering it.
 */
class AddMailingsCanceledStatus extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('mailings', [
            'status' => [
                'name'       => 'status',
                'type'       => 'ENUM',
                'constraint' => ['draft', 'sending', 'completed', 'paused', 'canceled'],
                'null'       => false,
                'default'    => 'draft',
            ],
        ]);

        $this->forge->modifyColumn('mailing_emails', [
            'status' => [
                'name'       => 'status',
                'type'       => 'ENUM',
                'constraint' => ['queued', 'sent', 'error', 'rejected', 'canceled'],
                'null'       => false,
                'default'    => 'queued',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('mailing_emails', [
            'status' => [
                'name'       => 'status',
                'type'       => 'ENUM',
                'constraint' => ['queued', 'sent', 'error', 'rejected'],
                'null'       => false,
                'default'    => 'queued',
            ],
        ]);

        $this->forge->modifyColumn('mailings', [
            'status' => [
                'name'       => 'status',
                'type'       => 'ENUM',
                'constraint' => ['draft', 'sending', 'completed', 'paused'],
                'null'       => false,
                'default'    => 'draft',
            ],
        ]);
    }
}
