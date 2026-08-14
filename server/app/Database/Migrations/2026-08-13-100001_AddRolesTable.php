<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the `user_roles` table: user-manageable roles, each holding a JSON
 * list of privilege strings (see App\Enums\Permission — the fixed,
 * code-defined catalog of privileges a role can be granted). Named
 * `user_roles` rather than plain `roles` so it reads unambiguously as "the
 * roles a user can hold", not some unrelated domain's roles. Seeds 3 roles
 * that exactly preserve the behaviour of the legacy `users.role` ENUM values
 * they replace (see AddUsersRolesColumn, which backfills every user onto
 * these ids) — granting broader/narrower privileges to any role is a
 * deliberate follow-up change made through the admin UI, not baked into
 * this migration.
 *
 * Role id 1 ("Разработчик") is a reserved, hardcoded role — see
 * RolesModel::DEVELOPER_ROLE_ID: it is the only role that may ever hold
 * Permission::USERS_MANAGE (enforced in RolesController), and it may only
 * ever be assigned to a single user at a time (enforced in
 * Members::updateRoles()). It replaces the old `admin` ENUM value 1:1.
 */
class AddRolesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'name' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => false,
            ],
            'permissions' => [
                'type'    => 'JSON',
                'null'    => false,
            ],
            'created_at DATETIME default current_timestamp',
            'updated_at DATETIME default current_timestamp',
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->createTable('user_roles');

        $this->db->table('user_roles')->insertBatch([
            [
                'id'          => 1,
                'name'        => 'Разработчик',
                'permissions' => json_encode([
                    'relay.control',
                    'objects.manage',
                    'photos.manage',
                    'mailings.manage',
                    'users.manage',
                    'comments.moderate',
                    'events.create',
                    'events.update',
                    'events.delete',
                    'events.gallery_upload',
                    'events.checkin',
                    'events.statistic',
                    'events.refund',
                    'events.users',
                    'pipeline.manage',
                ]),
            ],
            [
                'id'          => 2,
                'name'        => 'Команда',
                'permissions' => json_encode([
                    'comments.moderate',
                    'events.create',
                    'events.update',
                    'events.statistic',
                    'events.checkin',
                ]),
            ],
            [
                'id'          => 3,
                'name'        => 'Охрана',
                'permissions' => json_encode([
                    'events.checkin',
                ]),
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropTable('user_roles');
    }
}
