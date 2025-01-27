<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateObservatorySettingsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'key' => [
                'type'       => 'VARCHAR',
                'constraint' => 200,
                'unique'     => true
            ],
            'value' => [
                'type'       => 'VARCHAR',
                'constraint' => 200,
                'null'       => true
            ]
        ]);

        $this->forge->addPrimaryKey('key');
        $this->forge->createTable('observatory_settings');
    }

    public function down()
    {
        $this->forge->dropTable('observatory_settings');
    }
}