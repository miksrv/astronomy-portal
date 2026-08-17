<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Allows push_subscriptions.user_id to be NULL, so a device can subscribe to
 * Web Push before the visitor ever logs in (see the site-wide stargazing
 * banner). The existing FK to `users` (CASCADE/CASCADE) is left untouched —
 * a NULL FK value is simply exempt from the constraint, so an anonymous row
 * is unaffected by user deletion while a claimed row still cascades exactly
 * as before.
 */
class AllowAnonymousPushSubscriptions extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('push_subscriptions', [
            'user_id' => [
                'name'       => 'user_id',
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
            ],
        ]);
    }

    public function down()
    {
        // Anonymous rows can't survive a revert to NOT NULL — drop them first.
        $this->db->table('push_subscriptions')->where('user_id', null)->delete();

        $this->forge->modifyColumn('push_subscriptions', [
            'user_id' => [
                'name'       => 'user_id',
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
        ]);
    }
}
