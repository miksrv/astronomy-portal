<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds a `requires_registration` flag to events.
 *
 * Some events never go through the online booking flow at all — sidewalk
 * astronomy meetups and events imported into the archive from before online
 * registration existed. Defaults to true so every existing/bookable event
 * keeps behaving exactly as before; the one-time backfill below flips it to
 * false only for events that have already happened and never had a single
 * `events_users` row, so a real bookable event that simply got zero sign-ups
 * before its (still future, or just-closed) registration window isn't
 * misclassified.
 */
class AddEventRequiresRegistration extends Migration
{
    public function up()
    {
        $this->forge->addColumn('events', [
            'requires_registration' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => false,
                'default'    => 1,
                'after'      => 'max_tickets',
            ],
        ]);

        $registeredEventIds = $this->db->table('events_users')
            ->select('event_id')
            ->where('deleted_at IS NULL');

        $this->db->table('events')
            ->where('date <', date('Y-m-d H:i:s'))
            ->whereNotIn('id', $registeredEventIds)
            ->update(['requires_registration' => 0]);
    }

    public function down()
    {
        $this->forge->dropColumn('events', 'requires_registration');
    }
}
