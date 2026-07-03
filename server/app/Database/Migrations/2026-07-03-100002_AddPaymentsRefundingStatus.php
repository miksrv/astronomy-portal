<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds 'refunding' to payments.status.
 *
 * PaymentLibrary::refund() atomically flips 'paid' -> 'refunding' before
 * calling the gateway, so a concurrent duplicate refund attempt (a
 * double-click cancel, or a cancellation racing an admin's manual
 * re-verify) sees the payment is no longer 'paid' and bails out instead of
 * calling the gateway a second time.
 */
class AddPaymentsRefundingStatus extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('payments', [
            'status' => [
                'name'       => 'status',
                'type'       => 'ENUM',
                'constraint' => ['new', 'pending', 'paid', 'failed', 'canceled', 'refunding', 'refunded'],
                'null'       => false,
                'default'    => 'new',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('payments', [
            'status' => [
                'name'       => 'status',
                'type'       => 'ENUM',
                'constraint' => ['new', 'pending', 'paid', 'failed', 'canceled', 'refunded'],
                'null'       => false,
                'default'    => 'new',
            ],
        ]);
    }
}
