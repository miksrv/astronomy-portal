<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the generic `payments` table used by the acquiring layer.
 *
 * The table is intentionally decoupled from events: a payment references an
 * arbitrary domain entity via (`entity_type`, `entity_id`) so the same
 * mechanism can later cover donations, merch, etc. `amount` is stored in the
 * minor currency unit (kopecks), matching what acquiring gateways expect.
 */
class AddPayments extends Migration
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
            'gateway' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'null'       => false,
                'default'    => 'alfabank',
            ],
            'order_number' => [
                'type'       => 'VARCHAR',
                'constraint' => 32,
                'null'       => false,
            ],
            'order_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 64,
                'null'       => true,
            ],
            'entity_type' => [
                'type'       => 'VARCHAR',
                'constraint' => 30,
                'null'       => false,
            ],
            'entity_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 15,
                'null'       => false,
            ],
            'amount' => [
                'type'     => 'INT',
                'unsigned' => true,
                'null'     => false,
            ],
            'currency' => [
                'type'       => 'VARCHAR',
                'constraint' => 3,
                'null'       => false,
                'default'    => '810',
            ],
            'status' => [
                'type'       => 'ENUM',
                'constraint' => ['new', 'pending', 'paid', 'failed', 'canceled', 'refunded'],
                'null'       => false,
                'default'    => 'new',
            ],
            'form_url' => [
                'type'       => 'VARCHAR',
                'constraint' => 512,
                'null'       => true,
            ],
            'error_code' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'null'       => true,
            ],
            'error_message' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
            ],
            'paid_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'expires_at' => [
                'type' => 'DATETIME',
                'null' => true,
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
        $this->forge->addUniqueKey('order_number', 'uq_payments_order_number');
        $this->forge->addKey('order_id', false, false, 'idx_payments_order_id');
        $this->forge->addKey(['entity_type', 'entity_id'], false, false, 'idx_payments_entity');
        $this->forge->addKey(['status', 'expires_at'], false, false, 'idx_payments_status_expires');

        $this->forge->createTable('payments', true);
    }

    public function down()
    {
        $this->forge->dropTable('payments', true);
    }
}
