<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddMailingAudience extends Migration
{
    public function up()
    {
        $this->forge->addColumn('mailings', [
            'audience_type' => [
                'type'       => 'ENUM',
                'constraint' => ['all', 'event'],
                'null'       => false,
                'default'    => 'all',
                'after'      => 'status',
            ],
        ]);

        $this->forge->addColumn('mailings', [
            'audience_event_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
                'default'    => null,
                'after'      => 'audience_type',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('mailings', ['audience_type', 'audience_event_id']);
    }
}
