<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds a DB-level safety net against duplicate active bookings for the same
 * (event, user) pair.
 *
 * Events::booking() already serializes this via a row lock + status check,
 * but that protection only holds as long as every insert path goes through
 * that one method. A generated column that collapses to NULL for inactive
 * rows (cancelled/failed) lets a UNIQUE index enforce "at most one
 * pending/confirmed booking per user per event" at the schema level too —
 * MySQL/MariaDB ignore NULLs in a UNIQUE index, so cancelled/failed rows
 * never collide with a fresh booking for the same (event, user).
 *
 * MySQL/MariaDB only: SQLite (used by the test suite) has no generated-
 * column support wired through CI4's Forge, and the app-level lock already
 * covers tests. This mirrors the existing "FOR UPDATE is MySQL-only"
 * precedent in Events::booking()/cancel().
 */
class AddEventUsersActiveBookingUniqueKey extends Migration
{
    public function up()
    {
        if ($this->db->DBDriver !== 'MySQLi') {
            return;
        }

        $this->db->query("
            ALTER TABLE events_users
            ADD COLUMN active_booking_key VARCHAR(40)
                GENERATED ALWAYS AS (
                    CASE WHEN deleted_at IS NULL AND status IN ('pending', 'confirmed')
                         THEN CONCAT(event_id, ':', user_id)
                         ELSE NULL END
                ) VIRTUAL,
            ADD UNIQUE KEY uq_events_users_active_booking (active_booking_key)
        ");
    }

    public function down()
    {
        if ($this->db->DBDriver !== 'MySQLi') {
            return;
        }

        $this->db->query('ALTER TABLE events_users DROP COLUMN active_booking_key');
    }
}
