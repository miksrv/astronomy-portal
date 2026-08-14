<?php

namespace App\Models;

use App\Entities\RoleEntity;

/**
 * RolesModel
 *
 * Manages the `user_roles` table — user-manageable roles, each holding a
 * JSON list of privilege strings from the fixed App\Enums\Permission catalog.
 * A user's effective privileges are the union of every role they're
 * assigned (see SessionLibrary::$permissions), resolved fresh on every
 * request via getPermissionsForIds().
 */
class RolesModel extends ApplicationBaseModel
{
    /**
     * The reserved, hardcoded "Разработчик" role seeded by
     * AddRolesTable — the only role permitted to hold
     * Permission::USERS_MANAGE (enforced in the Roles controller), and the
     * only role permitted to be assigned to more than zero but never more
     * than one user at a time (enforced in Members::updateRoles()).
     */
    public const DEVELOPER_ROLE_ID = 1;

    protected $table            = 'user_roles';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = RoleEntity::class;
    protected $useSoftDeletes   = false;

    protected $allowedFields = [
        'name',
        'permissions',
    ];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    protected $skipValidation = true;

    /**
     * Resolves a set of role ids to the flat, deduplicated union of every
     * privilege string granted by any of them.
     *
     * @param array<int> $roleIds
     * @return array<string>
     */
    public function getPermissionsForIds(array $roleIds): array
    {
        if (empty($roleIds)) {
            return [];
        }

        $roles = $this->whereIn('id', $roleIds)->findAll();

        $permissions = [];

        foreach ($roles as $role) {
            foreach ($role->permissions ?? [] as $permission) {
                $permissions[$permission] = true;
            }
        }

        return array_keys($permissions);
    }

    /**
     * Returns how many users currently have each role assigned, keyed by
     * role id — used by the admin UI to warn before deleting a role that's
     * still in use. Computed with a single query over `users` (decoding the
     * JSON `roles` column in PHP) rather than one JSON_CONTAINS query per
     * role, so the cost of GET /roles doesn't grow with the number of roles.
     *
     * @return array<int, int>
     */
    public function countUsersPerRole(): array
    {
        $rows = $this->db->table('users')
            ->select('roles')
            ->where('deleted_at IS NULL')
            ->where('roles IS NOT NULL')
            ->get()
            ->getResult();

        $counts = [];

        foreach ($rows as $row) {
            $roleIds = json_decode($row->roles ?? '[]', true) ?: [];

            foreach ($roleIds as $roleId) {
                $roleId          = (int) $roleId;
                $counts[$roleId] = ($counts[$roleId] ?? 0) + 1;
            }
        }

        return $counts;
    }

    /**
     * Whether every id in $roleIds corresponds to an existing role row —
     * used to reject stale/bogus role ids before they're persisted onto a
     * user (see Members::updateRoles()).
     *
     * @param array<int> $roleIds
     */
    public function idsExist(array $roleIds): bool
    {
        if (empty($roleIds)) {
            return true;
        }

        $roleIds = array_unique($roleIds);

        return $this->whereIn('id', $roleIds)->countAllResults() === count($roleIds);
    }
}
