<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddNewsMedia extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type' => 'SMALLINT',
                'constraint' => 5,
                'unsigned' => true,
                'unique' => true,
                'auto_increment' => true,
            ],
            'news_id' => [
                'type' => 'INT',
                'constraint' => 5,
                'unsigned' => true,
            ],
            'telegram_id' => [
                'type' => 'INT',
                'constraint' => 5,
                'unsigned' => true,
            ],
            'telegram_date' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'group_id' => [
                'type' => 'BIGINT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'views' => [
                'type' => 'INT',
                'constraint' => 5,
                'unsigned' => true,
            ],
            'forwards' => [
                'type' => 'INT',
                'constraint' => 5,
                'unsigned' => true,
            ],
            'media_type' => [
                'type' => 'VARCHAR',
                'constraint' => 100,
                'null' => true,
            ],
            'media_file' => [
                'type' => 'VARCHAR',
                'constraint' => 250,
                'null' => true,
            ],
            'media_ext' => [
                'type' => 'VARCHAR',
                'constraint' => 20,
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'datetime',
                'null' => true,
            ],
            'created_at datetime default current_timestamp',
            'deleted_at' => [
                'type' => 'datetime',
                'null' => true,
            ],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('telegram_id');
        $this->forge->addKey('telegram_date');
        $this->forge->addKey('news_id');
        $this->forge->addKey('group_id');
        $this->forge->createTable('news_media');
    }

    public function down()
    {
        $this->forge->dropTable('news_media');
    }
}
