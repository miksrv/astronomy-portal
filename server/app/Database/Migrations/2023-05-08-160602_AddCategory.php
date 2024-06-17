<?php namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddCategory extends Migration {
    public function up() {
        $this->forge->addField([
            'id' => [
                'type'           => 'SMALLINT',
                'constraint'     => 4,
                'unsigned'       => true,
                'unique'         => true,
                'auto_increment' => true
            ],
            'name' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true
            ]
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('name');
        $this->forge->createTable('category');
    }

    public function down() {
        $this->forge->dropTable('category');
    }
}
