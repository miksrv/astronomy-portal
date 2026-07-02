<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Single-use tokens for passwordless email login.
 *
 * A row is created when a login link is requested and consumed exactly once
 * when the link is clicked (atomic UPDATE ... WHERE used_at IS NULL). Only
 * the SHA-256 hash of the token is stored; the raw value exists only in the
 * emailed link. Rows also double as the rate-limit ledger for the request
 * endpoint (per-email cooldown, per-IP burst cap) — no separate table needed.
 */
class AddMagicLinkTokens extends Migration
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
            'email' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
            'user_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => true,
            ],
            'token_hash' => [
                'type'       => 'VARCHAR',
                'constraint' => 64,
                'null'       => false,
            ],
            'return_path' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
            ],
            'ip_address' => [
                'type'       => 'VARCHAR',
                'constraint' => 45,
                'null'       => true,
            ],
            'expires_at' => [
                'type' => 'DATETIME',
                'null' => false,
            ],
            'used_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'created_at DATETIME default current_timestamp',
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('email');
        $this->forge->addUniqueKey('token_hash');
        $this->forge->addKey('expires_at');
        // Forge::addForeignKey($field, $table, $tableField, $onUpdate, $onDelete) —
        // onUpdate comes before onDelete. A deleted user must not cascade-delete
        // an unrelated token row, so onDelete is SET NULL; onUpdate is CASCADE
        // (the id is a stable uniqid() and never changes in practice).
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'SET NULL');
        $this->forge->createTable('magic_link_tokens');
    }

    public function down()
    {
        $this->forge->dropTable('magic_link_tokens');
    }
}
