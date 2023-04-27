<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddNewsMedia extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'SMALLINT',
                'constraint'     => 5,
                'unsigned'       => true,
                'unique'         => true,
                'auto_increment' => true,
            ],
            'blog_id' => [
                'type'       => 'INT',
                'constraint' => 5,
                'unsigned'   => true,
            ],
            'telegram_id' => [
                'type'       => 'INT',
                'constraint' => 5,
                'unsigned'   => true,
            ],
            'telegram_date' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'group_id' => [
                'type'       => 'BIGINT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'views' => [
                'type'       => 'INT',
                'constraint' => 5,
                'unsigned'   => true,
            ],
            'forwards' => [
                'type'       => 'INT',
                'constraint' => 5,
                'unsigned'   => true,
            ],
            'file' => [
                'type'       => 'VARCHAR',
                'constraint' => 250,
                'null'       => true,
            ],
            'height' => [
                'type'       => 'INT',
                'constraint' => 10,
                'unsigned'   => true,
            ],
            'width' => [
                'type'       => 'INT',
                'constraint' => 10,
                'unsigned'   => true,
            ],
            'created_at' => [
                'type' => 'datetime',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'datetime',
                'null' => true,
            ],
            'deleted_at' => [
                'type' => 'datetime',
                'null' => true,
            ],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('telegram_id');
        $this->forge->addKey('telegram_date');
        $this->forge->addKey('blog_id');
        $this->forge->addKey('group_id');
        $this->forge->createTable('blog_media');
    }

    public function down()
    {
        $this->forge->dropTable('blog_media');
    }
}
