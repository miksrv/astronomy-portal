<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds a session-revocation slot to users: a random token embedded in every
 * JWT issued at login (as the `sid` claim) and checked on every authenticated
 * request. Logging out clears it to NULL, instantly invalidating every token
 * issued before that point (on any device) regardless of the JWT's own exp —
 * without having to shorten the token lifetime itself.
 */
class AddUsersSessionToken extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'session_token' => [
                'type'       => 'VARCHAR',
                'constraint' => 64,
                'null'       => true,
                'default'    => null,
                'after'      => 'service_id',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', 'session_token');
    }
}
