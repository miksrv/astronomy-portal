<?php

namespace App\Models;

use App\Entities\UserEntity;
use CodeIgniter\I18n\Time;
use Exception;
use ReflectionException;

/**
 * UsersModel
 *
 * Manages the `users` table. Supports soft deletes, UUID primary keys, and multi-role
 * access (`roles` — a JSON array of `user_roles.id` values; see RolesModel/Permission).
 * Provides helpers for OAuth look-up, activity tracking, newsletter subscriber
 * retrieval, and paginated admin user listing with event counts.
 */
class UsersModel extends ApplicationBaseModel
{
    protected $table            = 'users';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = UserEntity::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    /** @var array<string> Fields stripped from query results by the prepareOutput afterFind callback. */
    protected array $hiddenFields = ['deleted_at'];

    protected $allowedFields = [
        'name',
        'email',
        'phone',
        'avatar',
        'auth_type',
        'roles',
        'locale',
        'settings',
        'sex',
        'birthday',
        'service_id',
        'session_token',
        'created_at',
        'updated_at',
        'activity_at',
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat         = 'datetime';
    protected $createdField       = 'created_at';
    protected $updatedField       = 'updated_at';
    protected $deletedField       = 'deleted_at';

    // Validation
    protected $validationRules      = [];
    protected $validationMessages   = [];
    protected $skipValidation       = true;
    protected $cleanValidationRules = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];
    protected $afterInsert    = [];
    protected $beforeUpdate   = [];
    protected $afterUpdate    = [];
    protected $beforeFind     = [];
    protected $afterFind      = ['prepareOutput'];
    protected $beforeDelete   = [];
    protected $afterDelete    = [];

    /**
     * Finds a user by their email address.
     *
     * @param string $emailAddress The email address to search for.
     * @return UserEntity|array|null The user entity or array, or null if not found.
     */
    public function findUserByEmailAddress(string $emailAddress): UserEntity|array|null
    {
        return $this
            ->select('id, name, phone, avatar, email, auth_type, roles, locale, sex, birthday, session_token')
            ->where('email', $emailAddress)
            ->first();
    }

    /**
     * Finds a user by email, or creates a bare new one if none exists.
     *
     * Used by the passwordless email login flow only. Unlike OAuth's
     * `Auth::_serviceAuth()`, this never overwrites an existing user's
     * auth_type — logging in via a magic link must work regardless of which
     * provider an account originally signed up with, and must not clobber
     * that provider's auth_type on subsequent logins. auth_type is only set
     * when the account is created here for the first time.
     *
     * @param string $email    Email address, already validated by the caller.
     * @param string $authType auth_type to assign only if a new user is created.
     * @return array{0: UserEntity, 1: bool} The user, and whether it was just created.
     */
    public function findOrCreateByEmail(string $email, string $authType): array
    {
        $userData = $this->findUserByEmailAddress($email);

        if (!empty($userData)) {
            return [$userData, false];
        }

        $newUser = new UserEntity();
        $newUser->name      = explode('@', $email)[0];
        $newUser->email     = $email;
        $newUser->auth_type = $authType;

        $this->insert($newUser);
        $newUser->id = $this->getInsertID();

        return [$newUser, true];
    }

    /**
     * Retrieves all users eligible to receive newsletter emails.
     *
     * Eligible means: non-empty email address, not soft-deleted, and the
     * subscribe_newsletter setting is not explicitly set to false (0).
     *
     * @return array Array of plain objects with id, email, and locale fields.
     */
    public function getNewsletterSubscribers(): array
    {
        return $this->db->table($this->table)
            ->select('id, email, locale')
            ->where('email IS NOT NULL')
            ->where("email != ''")
            ->where('deleted_at IS NULL')
            ->groupStart()
                ->where('settings IS NULL')
                ->orWhere("JSON_EXTRACT(settings, '$.subscribe_newsletter') IS NULL")
                ->orWhere("JSON_EXTRACT(settings, '$.subscribe_newsletter') != 0")
            ->groupEnd()
            ->get()
            ->getResultArray();
    }

    /**
     * Updates the user's last-activity timestamp.
     *
     * Debounced: the update is skipped if activity was already recorded within the
     * last 5 minutes to avoid excessive write load.
     *
     * @param string $userId The user's ID.
     * @return void
     * @throws ReflectionException
     * @throws Exception
     */
    public function updateUserActivity(string $userId): void
    {
        $user = $this->select('activity_at')->find($userId);

        if ($user && $user->activity_at && (time() - strtotime((string) $user->activity_at)) < 300) {
            return;
        }

        $this->update($userId, ['activity_at' => Time::now()]);
    }

    /**
     * Returns a paginated list of users with their event attendance count.
     *
     * Email and phone fields are intentionally excluded from the output.
     * Supports filtering by name substring and by role, as well as sorting
     * by name, activity date, creation date, or event count.
     *
     * @param int        $page    1-based page number. Default is 1.
     * @param int        $limit   Rows per page (max 100). Default is 20.
     * @param string     $search  Optional name substring filter.
     * @param array<int> $roleIds Optional role id filter — matches a user
     *                            holding ANY of the given roles (OR
     *                            semantics), since a user can be assigned
     *                            several roles at once (see RolesModel).
     *                            Empty array means "no filter".
     * @param string     $sortBy  Column to sort by: name|activityAt|createdAt|eventsCount.
     * @param string     $sortDir Sort direction: asc|desc.
     * @return array{items: array, count: int, page: int, totalPages: int}
     */
    public function getUsersList(
        int    $page = 1,
        int    $limit = 20,
        string $search = '',
        array  $roleIds = [],
        string $sortBy = 'createdAt',
        string $sortDir = 'desc'
    ): array {
        $sortColumnMap = [
            'name'        => 'u.name',
            'activityAt'  => 'u.activity_at',
            'createdAt'   => 'u.created_at',
            // Use the aggregate expression directly — ordering by alias is unreliable
            // in MySQL/MariaDB when the query builder wraps it in backticks.
            'eventsCount' => 'COUNT(eu.id)',
        ];

        $orderColumn    = $sortColumnMap[$sortBy] ?? 'u.created_at';
        $orderDirection = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';

        $builder = $this->db->table('users u')
            ->select('u.id, u.name, u.avatar, u.roles, u.auth_type, u.locale, u.sex, u.birthday, u.activity_at, u.created_at, COUNT(eu.id) AS events_count')
            ->join('events_users eu', 'eu.user_id = u.id AND eu.deleted_at IS NULL', 'left')
            ->join('events e', 'e.id = eu.event_id AND e.deleted_at IS NULL', 'left')
            ->where('u.deleted_at IS NULL')
            ->groupBy('u.id')
            ->orderBy($orderColumn, $orderDirection)
            ->orderBy('u.id', 'ASC');

        if ($search !== '') {
            $builder->like('u.name', $search);
        }

        if (!empty($roleIds)) {
            $this->_filterByRoleIds($builder, $roleIds);
        }

        $countBuilder = $this->db->table('users u')
            ->select('COUNT(DISTINCT u.id) AS total')
            ->where('u.deleted_at IS NULL');

        if ($search !== '') {
            $countBuilder->like('u.name', $search);
        }

        if (!empty($roleIds)) {
            $this->_filterByRoleIds($countBuilder, $roleIds);
        }

        $count      = (int) $countBuilder->get()->getRow()->total;
        $totalPages = $limit > 0 ? (int) ceil($count / $limit) : 1;
        $offset     = ($page - 1) * $limit;

        $rows = $builder->limit($limit, $offset)->get()->getResult();

        // Resolve every distinct role id referenced across this page in one
        // query, rather than joining the JSON array in SQL.
        $allRoleIds = [];

        foreach ($rows as $user) {
            $userRoleIds = json_decode($user->roles ?? '[]', true) ?: [];
            $allRoleIds  = array_merge($allRoleIds, $userRoleIds);
        }

        $roleNamesById = [];

        if (!empty($allRoleIds)) {
            $roleRows = $this->db->table('user_roles')
                ->select('id, name')
                ->whereIn('id', array_unique($allRoleIds))
                ->get()
                ->getResult();

            foreach ($roleRows as $role) {
                $roleNamesById[(int) $role->id] = $role->name;
            }
        }

        $items = [];

        foreach ($rows as $user) {
            $age = null;

            if (!empty($user->birthday)) {
                $birthDate = new \DateTime($user->birthday);
                $today     = new \DateTime();
                $age       = (int) $birthDate->diff($today)->y;
            }

            $userRoleIds = json_decode($user->roles ?? '[]', true) ?: [];
            $userRoles   = [];

            foreach ($userRoleIds as $roleId) {
                if (isset($roleNamesById[(int) $roleId])) {
                    $userRoles[] = ['id' => (int) $roleId, 'name' => $roleNamesById[(int) $roleId]];
                }
            }

            $items[] = [
                'id'          => $user->id,
                'name'        => $user->name,
                'avatar'      => $user->avatar,
                'roles'       => $userRoles,
                'authType'    => $user->auth_type,
                'locale'      => $user->locale,
                'sex'         => $user->sex,
                'age'         => $age,
                'activityAt'  => $user->activity_at,
                'createdAt'   => $user->created_at,
                'eventsCount' => (int) $user->events_count,
            ];
        }

        return [
            'items'      => $items,
            'count'      => $count,
            'page'       => $page,
            'totalPages' => $totalPages,
        ];
    }

    /**
     * Returns all events a user has registered for (non-cancelled bookings).
     *
     * @param string $userId The user's ID.
     * @param string $locale Locale code for the event title field ('ru' or 'en'). Default is 'ru'.
     * @return array Array of associative arrays with event and booking details in camelCase.
     */
    public function getUserEvents(string $userId, string $locale = 'ru'): array
    {
        $titleField = in_array($locale, ['ru', 'en'], true) ? 'title_' . $locale : 'title_ru';

        $rows = $this->db->table('events_users eu')
            ->select(
                "e.id, e.{$titleField} AS title, e.location, e.date, " .
                'e.cover_file_name, e.cover_file_ext, ' .
                'eu.adults, eu.children, eu.checkin_at, eu.created_at AS registered_at'
            )
            ->join('events e', 'e.id = eu.event_id')
            ->where('eu.user_id', $userId)
            ->where('eu.deleted_at IS NULL')
            ->orderBy('e.date', 'DESC')
            ->get()
            ->getResult();

        $items = [];

        foreach ($rows as $row) {
            $items[] = [
                'id'            => $row->id,
                'title'         => $row->title,
                'location'      => $row->location,
                'date'          => $row->date,
                'coverFileName' => $row->cover_file_name,
                'coverFileExt'  => $row->cover_file_ext,
                'adults'        => (int) $row->adults,
                'children'      => (int) $row->children,
                'checkinAt'     => $row->checkin_at,
                'registeredAt'  => $row->registered_at,
            ];
        }

        return $items;
    }

    /**
     * Replaces a user's full set of assigned roles.
     *
     * @param string     $userId  The user's ID.
     * @param array<int> $roleIds Role ids to assign; an empty array means
     *                            "no elevated roles" (a plain user).
     */
    public function updateRoles(string $userId, array $roleIds): void
    {
        $roleIds = array_values(array_unique(array_map('intval', $roleIds)));

        $this->update($userId, ['roles' => json_encode($roleIds)]);
    }

    /**
     * Restricts a `users u` query builder to rows holding at least one of
     * the given role ids — OR'd JSON_CONTAINS checks, since a user's `roles`
     * column can list several. Shared by getUsersList()'s row and count
     * queries (see the `roleIds` filter there).
     *
     * @param array<int> $roleIds
     */
    private function _filterByRoleIds($builder, array $roleIds): void
    {
        $builder->groupStart();

        foreach (array_values($roleIds) as $index => $roleId) {
            $method = $index === 0 ? 'where' : 'orWhere';
            $builder->{$method}("JSON_CONTAINS(u.roles, '" . (int) $roleId . "')", null, false);
        }

        $builder->groupEnd();
    }

    /**
     * Whether $roleId is currently assigned to any user other than
     * $excludeUserId. Used to enforce that the reserved developer role
     * (RolesModel::DEVELOPER_ROLE_ID) is never held by more than one person
     * at a time — see Members::updateRoles().
     */
    public function isRoleAssignedToOtherUser(int $roleId, string $excludeUserId): bool
    {
        return $this->db->table('users')
            ->where('deleted_at IS NULL')
            ->where('id !=', $excludeUserId)
            ->where("JSON_CONTAINS(roles, '{$roleId}')", null, false)
            ->countAllResults() > 0;
    }

    /**
     * Strips a role id from every user's `roles` array. Called by
     * Roles::delete() before the role row itself is removed — there is no
     * foreign key to cascade this automatically, since `users.roles` is a
     * plain JSON array rather than a join table.
     *
     * A PHP-side read/rewrite is used instead of a raw JSON_REMOVE/JSON_SEARCH
     * query for portability across MySQL/MariaDB versions on shared hosting,
     * and because the affected row count is expected to be small.
     */
    public function removeRoleFromAllUsers(int $roleId): void
    {
        $affectedUsers = $this->db->table('users')
            ->select('id, roles')
            ->where('deleted_at IS NULL')
            ->where("JSON_CONTAINS(roles, '{$roleId}')", null, false)
            ->get()
            ->getResult();

        foreach ($affectedUsers as $user) {
            $roleIds = json_decode($user->roles ?? '[]', true) ?: [];
            $roleIds = array_values(array_diff($roleIds, [$roleId]));

            $this->db->table('users')
                ->where('id', $user->id)
                ->update(['roles' => json_encode($roleIds)]);
        }
    }
}
