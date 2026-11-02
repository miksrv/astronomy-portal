<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * `events.date` is what every public events query filters and sorts by (the upcoming
 * event, the archive, the conducted count), and it had no index.
 */
class AddEventsDateIndex extends Migration
{
    public function up()
    {
        $this->forge->addKey('date', false, false, 'events_date');
        $this->forge->processIndexes('events');
    }

    public function down()
    {
        $this->forge->dropKey('events', 'events_date');
    }
}
