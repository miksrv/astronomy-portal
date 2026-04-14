<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddUserSettings extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'settings' => [
                'type'    => 'JSON',
                'null'    => true,
                'default' => null,
                'after'   => 'locale',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', 'settings');
    }
}
