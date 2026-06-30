<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds the per-event adult ticket price.
 *
 * `ticket_price` is the price (in RUB) charged per adult. Children (under 18)
 * are always free and are not counted towards the amount. A value of 0 means
 * the event is free and no payment is required to register.
 */
class AddEventTicketPrice extends Migration
{
    public function up()
    {
        $this->forge->addColumn('events', [
            'ticket_price' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'null'       => false,
                'default'    => 0,
                'after'      => 'max_tickets',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('events', 'ticket_price');
    }
}
