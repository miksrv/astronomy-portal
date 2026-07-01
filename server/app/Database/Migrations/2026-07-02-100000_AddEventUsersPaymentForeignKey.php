<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds a real foreign key from events_users.payment_id to payments.id,
 * matching the referential integrity already enforced on event_id/user_id
 * (the earlier AddEventUserPaymentColumns migration only added a plain
 * index, not a constraint).
 *
 * ON DELETE SET NULL, not CASCADE: a payment is an audit record of a
 * booking, not the other way around — losing the payment row must not take
 * the booking down with it. In practice `payments` is soft-deleted, so this
 * only matters for a hard delete.
 */
class AddEventUsersPaymentForeignKey extends Migration
{
    public function up()
    {
        $this->forge->addForeignKey('payment_id', 'payments', 'id', 'CASCADE', 'SET NULL', 'fk_events_users_payment');
        $this->forge->processIndexes('events_users');
    }

    public function down()
    {
        $this->forge->dropForeignKey('events_users', 'fk_events_users_payment');
    }
}
