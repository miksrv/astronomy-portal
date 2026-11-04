<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The live observatory status (FEAT-30): `observatory_status` keeps only the latest snapshot the
 * observatory agent pushed (one row, id 1), `observatory_events` the state transitions it
 * reported (roof opened, weather alert, device lost…), pruned after 90 days.
 */
class AddObservatoryStatus extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'unsigned'   => true,
            ],
            // JSON
            'snapshot' => [
                'type' => 'MEDIUMTEXT',
            ],
            'received_at' => [
                'type' => 'DATETIME',
            ],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->createTable('observatory_status', true);

        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'type' => [
                'type'       => 'VARCHAR',
                'constraint' => 40,
            ],
            'device' => [
                'type'       => 'VARCHAR',
                'constraint' => 60,
                'null'       => true,
            ],
            // JSON, optional details
            'payload' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            // When it happened at the observatory (UTC)
            'created_at' => [
                'type' => 'DATETIME',
            ],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('created_at', false, false, 'observatory_events_created');
        $this->forge->createTable('observatory_events', true);
    }

    public function down()
    {
        $this->forge->dropTable('observatory_events', true);
        $this->forge->dropTable('observatory_status', true);
    }
}
