<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * FEAT-26 — bookkeeping table for in-progress chunked event-media (photo or
 * video) uploads. Deliberately separate from `events_media`: this table
 * tracks ephemeral, not-yet-displayed upload state (which chunks have
 * arrived so far, for which event/user), cleaned up automatically by
 * `media:cleanup-uploads` — a fundamentally different kind of data from
 * finished gallery content.
 *
 * Each row has a matching temp directory on disk holding one file per
 * received chunk (see UPLOAD_EVENTS/{eventId}/tmp/{sessionId}/{index}.part),
 * reassembled in order at finalize time and deleted afterward (success or
 * cancel).
 */
class AddEventsMediaUploads extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
                'unique'     => true,
            ],
            'event_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
            'user_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
            'media_type' => [
                'type' => "ENUM('photo', 'video')",
                'null' => false,
            ],
            'original_file_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
            'mime_type' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => false,
            ],
            'total_size' => [
                'type'     => 'BIGINT',
                'unsigned' => true,
                'null'     => false,
            ],
            'chunk_size' => [
                'type'     => 'INT',
                'unsigned' => true,
                'null'     => false,
            ],
            'received_bytes' => [
                'type'     => 'BIGINT',
                'unsigned' => true,
                'null'     => false,
                'default'  => 0,
            ],
            'status' => [
                'type'    => "ENUM('uploading', 'finalizing', 'completed', 'aborted')",
                'null'    => false,
                'default' => 'uploading',
            ],
            'created_at DATETIME default current_timestamp',
            'updated_at DATETIME default current_timestamp',
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('event_id', 'events', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addKey('status');
        $this->forge->createTable('events_media_uploads');
    }

    public function down()
    {
        $this->forge->dropTable('events_media_uploads');
    }
}
