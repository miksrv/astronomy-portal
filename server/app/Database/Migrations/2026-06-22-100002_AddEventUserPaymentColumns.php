<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Links event bookings to payments and tracks confirmation state.
 *
 * - `payment_id`         references the `payments` row for paid bookings (null for free events).
 * - `status`             'pending' until the payment is confirmed; 'confirmed' for free or paid bookings.
 *                        Existing rows default to 'confirmed' so historic bookings stay valid.
 * - `checkin_by_user_id` records who performed the check-in. The Events controller already
 *                        writes this field, but the original migration never created the column.
 */
class AddEventUserPaymentColumns extends Migration
{
    public function up()
    {
        // Add only the columns that are missing. `checkin_by_user_id` was added
        // out-of-band on some environments (the controller has long written it),
        // so guarding each column keeps this migration idempotent and avoids a
        // "Duplicate column name" failure on the whole ALTER.
        $columns = [];

        if (! $this->db->fieldExists('status', 'events_users')) {
            $columns['status'] = [
                'type'       => 'ENUM',
                'constraint' => ['pending', 'confirmed'],
                'null'       => false,
                'default'    => 'confirmed',
                'after'      => 'children_ages',
            ];
        }

        if (! $this->db->fieldExists('payment_id', 'events_users')) {
            $columns['payment_id'] = [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
                'after'      => 'status',
            ];
        }

        if (! $this->db->fieldExists('checkin_by_user_id', 'events_users')) {
            $columns['checkin_by_user_id'] = [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
                'after'      => 'checkin_at',
            ];
        }

        if ($columns !== []) {
            $this->forge->addColumn('events_users', $columns);
        }

        if (array_key_exists('payment_id', $columns)) {
            $this->forge->addKey('payment_id', false, false, 'idx_events_users_payment');
            $this->forge->processIndexes('events_users');
        }
    }

    public function down()
    {
        foreach (['status', 'payment_id', 'checkin_by_user_id'] as $column) {
            if ($this->db->fieldExists($column, 'events_users')) {
                $this->forge->dropColumn('events_users', $column);
            }
        }
    }
}
