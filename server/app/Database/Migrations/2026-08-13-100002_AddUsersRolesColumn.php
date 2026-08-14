<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds `users.roles` — a JSON array of `user_roles.id` values, replacing the
 * single `users.role` ENUM with multi-role support. Backfills every existing
 * user from their legacy `role` value onto the matching seeded role id (see
 * AddRolesTable), then drops the now-unused `role` column — behaviour is
 * unchanged after this deploy, since every access check already reads
 * `roles`/`Permission`, not the legacy ENUM.
 */
class AddUsersRolesColumn extends Migration
{
    private const ROLE_ID_MAP = [
        'admin'     => 1,
        'moderator' => 2,
        'security'  => 3,
    ];

    public function up()
    {
        $this->forge->addColumn('users', [
            'roles' => [
                'type'    => 'JSON',
                'null'    => true,
                'default' => null,
                'after'   => 'role',
            ],
        ]);

        foreach (self::ROLE_ID_MAP as $legacyRole => $roleId) {
            $this->db->table('users')
                ->where('role', $legacyRole)
                ->update(['roles' => json_encode([$roleId])]);
        }

        // Anything else (the 'user' default, or no row matched above) becomes
        // an empty role set — a plain authenticated account, same as today.
        $this->db->table('users')
            ->where('roles IS NULL')
            ->update(['roles' => json_encode([])]);

        $this->forge->dropColumn('users', 'role');
    }

    public function down()
    {
        $this->forge->addColumn('users', [
            'role' => [
                'type'    => 'ENUM("user", "security", "moderator", "admin")',
                'null'    => false,
                'default' => 'user',
                'after'   => 'auth_type',
            ],
        ]);

        // Best-effort reverse mapping from `roles` (a JSON array — a user can
        // hold several) back onto the single legacy ENUM value. Processed
        // lowest-privilege-first so that, for a user holding more than one
        // seeded role, the highest-privilege one wins and ends up written
        // last — matching the escalation order the ENUM itself implied
        // (admin > moderator > security > user).
        foreach (array_reverse(self::ROLE_ID_MAP, true) as $legacyRole => $roleId) {
            $this->db->table('users')
                ->where("JSON_CONTAINS(roles, '{$roleId}')", null, false)
                ->update(['role' => $legacyRole]);
        }

        $this->forge->dropColumn('users', 'roles');
    }
}
