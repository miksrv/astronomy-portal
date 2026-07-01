<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds 'failed' to events_users.status.
 *
 * A declined/expired/canceled payment no longer soft-deletes the booking —
 * it flips status to 'failed' so the same row can be resurrected (retried)
 * instead of accumulating a new row per attempt. Queries that previously
 * relied on soft-delete alone to exclude non-real registrations (member
 * lists, statistics, mailing audiences, participant counts) must now also
 * exclude status = 'failed' explicitly.
 */
class AddEventUsersFailedStatus extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('events_users', [
            'status' => [
                'name'       => 'status',
                'type'       => 'ENUM',
                'constraint' => ['pending', 'confirmed', 'failed'],
                'null'       => false,
                'default'    => 'confirmed',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('events_users', [
            'status' => [
                'name'       => 'status',
                'type'       => 'ENUM',
                'constraint' => ['pending', 'confirmed'],
                'null'       => false,
                'default'    => 'confirmed',
            ],
        ]);
    }
}
