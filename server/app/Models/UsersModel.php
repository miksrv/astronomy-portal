<?php

namespace App\Models;

use App\Entities\UserEntity;
use CodeIgniter\I18n\Time;
use Exception;
use ReflectionException;

/**
 * UsersModel
 *
 * Manages the `users` table. Supports soft deletes, UUID primary keys, and role-based
 * access (user, moderator, admin). Provides helpers for OAuth look-up, activity tracking,
 * newsletter subscriber retrieval, and paginated admin user listing with event counts.
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
        'role',
        'locale',
        'settings',
        'sex',
        'birthday',
        'service_id',
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
            ->select('id, name, phone, avatar, email, auth_type, role, locale')
            ->where('email', $emailAddress)
            ->first();
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
     * Supports filtering by name substring, role, and auth type, as well as
     * sorting by name, activity date, creation date, or event count.
     *
     * @param int    $page     1-based page number. Default is 1.
     * @param int    $limit    Rows per page (max 100). Default is 20.
     * @param string $search   Optional name substring filter.
     * @param string $role     Optional role filter: user|moderator|security|admin.
     * @param string $authType Optional auth_type filter: google|yandex|vk|native.
     * @param string $sortBy   Column to sort by: name|activityAt|createdAt|eventsCount.
     * @param string $sortDir  Sort direction: asc|desc.
     * @return array{items: array, count: int, page: int, totalPages: int}
     */
    public function getUsersList(
        int    $page = 1,
        int    $limit = 20,
        string $search = '',
        string $role = '',
        string $authType = '',
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
            ->select('u.id, u.name, u.avatar, u.role, u.auth_type, u.locale, u.sex, u.birthday, u.activity_at, u.created_at, COUNT(eu.id) AS events_count')
            ->join('events_users eu', 'eu.user_id = u.id AND eu.deleted_at IS NULL', 'left')
            ->join('events e', 'e.id = eu.event_id AND e.deleted_at IS NULL', 'left')
            ->where('u.deleted_at IS NULL')
            ->groupBy('u.id')
            ->orderBy($orderColumn, $orderDirection)
            ->orderBy('u.id', 'ASC');

        if ($search !== '') {
            $builder->like('u.name', $search);
        }

        if ($role !== '') {
            $builder->where('u.role', $role);
        }

        if ($authType !== '') {
            $builder->where('u.auth_type', $authType);
        }

        $countBuilder = $this->db->table('users u')
            ->select('COUNT(DISTINCT u.id) AS total')
            ->where('u.deleted_at IS NULL');

        if ($search !== '') {
            $countBuilder->like('u.name', $search);
        }

        if ($role !== '') {
            $countBuilder->where('u.role', $role);
        }

        if ($authType !== '') {
            $countBuilder->where('u.auth_type', $authType);
        }

        $count      = (int) $countBuilder->get()->getRow()->total;
        $totalPages = $limit > 0 ? (int) ceil($count / $limit) : 1;
        $offset     = ($page - 1) * $limit;

        $rows  = $builder->limit($limit, $offset)->get()->getResult();
        $items = [];

        foreach ($rows as $user) {
            $age = null;

            if (!empty($user->birthday)) {
                $birthDate = new \DateTime($user->birthday);
                $today     = new \DateTime();
                $age       = (int) $birthDate->diff($today)->y;
            }

            $items[] = [
                'id'          => $user->id,
                'name'        => $user->name,
                'avatar'      => $user->avatar,
                'role'        => $user->role,
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
            ->select("e.id, e.{$titleField} AS title, e.date, eu.adults, eu.children, eu.checkin_at, eu.created_at AS registered_at")
            ->join('events e', 'e.id = eu.event_id')
            ->where('eu.user_id', $userId)
            ->where('eu.deleted_at IS NULL')
            ->orderBy('e.date', 'DESC')
            ->get()
            ->getResult();

        $items = [];

        foreach ($rows as $row) {
            $items[] = [
                'id'           => $row->id,
                'title'        => $row->title,
                'date'         => $row->date,
                'adults'       => (int) $row->adults,
                'children'     => (int) $row->children,
                'checkinAt'    => $row->checkin_at,
                'registeredAt' => $row->registered_at,
            ];
        }

        return $items;
    }
}
