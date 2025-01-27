<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateObservatoryEquipmentTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'equipment_type' => [
                'type'       => 'ENUM',
                'constraint' => ['camera', 'mount', 'scope', 'guiding_scope', 'guiding_camera', 'filter_wheel', 'filter', 'focuser'],
                'null'       => false,
            ],
            'brand' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
            ],
            'model' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
            ],
            'specifications' => [
                'type' => 'TEXT',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->createTable('observatory_equipment');
    }

    public function down()
    {
        $this->forge->dropTable('observatory_equipment');
    }
}
