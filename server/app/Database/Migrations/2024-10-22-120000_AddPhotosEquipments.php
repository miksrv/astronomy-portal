<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePhotosEquipmentsTable extends Migration
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
            'photo_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
            'equipment_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => false,
            ],
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('photo_id', 'photos', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('equipment_id', 'observatory_equipment', 'id', 'CASCADE', 'CASCADE');

        $this->forge->createTable('photos_equipments');
    }

    public function down()
    {
        $this->forge->dropTable('photos_equipments');
    }
}
