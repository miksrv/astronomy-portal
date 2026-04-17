<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddComments extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
            'user_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
            'entity_type' => [
                'type'       => 'ENUM',
                'constraint' => ['event', 'photo'],
                'null'       => false,
            ],
            'entity_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
            'content' => [
                'type' => 'TEXT',
                'null' => false,
            ],
            'rating' => [
                'type'     => 'TINYINT',
                'unsigned' => true,
                'null'     => true,
                'default'  => null,
            ],
            'status' => [
                'type'       => 'ENUM',
                'constraint' => ['visible', 'hidden'],
                'null'       => false,
                'default'    => 'visible',
            ],
            'created_at' => [
                'type'    => 'DATETIME',
                'null'    => false,
                'default' => null,
            ],
            'updated_at' => [
                'type'    => 'DATETIME',
                'null'    => false,
                'default' => null,
            ],
            'deleted_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE', 'fk_comments_user');
        $this->forge->addUniqueKey(['user_id', 'entity_type', 'entity_id'], 'uq_user_entity');
        $this->forge->addKey(['entity_type', 'entity_id', 'deleted_at', 'status'], false, false, 'idx_entity');
        $this->forge->addKey(['user_id', 'deleted_at'], false, false, 'idx_user');

        $this->forge->createTable('comments', true);
    }

    public function down()
    {
        $this->forge->dropTable('comments', true);
    }
}
