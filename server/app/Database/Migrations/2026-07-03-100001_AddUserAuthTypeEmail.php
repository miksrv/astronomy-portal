<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds 'email' to users.auth_type for passwordless magic-link login.
 *
 * Additive only — existing rows keep their current auth_type unchanged.
 * A user who originally signed up via google/yandex/vk can still log in via
 * a magic link; that path never rewrites auth_type on an existing account
 * (see UsersModel::findOrCreateByEmail()), so this value only ever appears
 * on accounts that were first created through the email login flow.
 */
class AddUserAuthTypeEmail extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('users', [
            'auth_type' => [
                'name' => 'auth_type',
                'type' => 'ENUM("native", "google", "yandex", "vk", "email")',
                'null' => true,
            ],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('users', [
            'auth_type' => [
                'name' => 'auth_type',
                'type' => 'ENUM("native", "google", "yandex", "vk")',
                'null' => true,
            ],
        ]);
    }
}
