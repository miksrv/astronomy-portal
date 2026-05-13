<?php

namespace App\Models;

use App\Entities\EventUserEntity;

/**
 * EventsUsersModel
 *
 * Manages the `events_users` pivot table that records user bookings and
 * check-ins for stargazing events. Supports soft deletes (cancelled bookings)
 * and UUID primary keys generated via the beforeInsert callback.
 */
class EventsUsersModel extends ApplicationBaseModel
{
    protected $table            = 'events_users';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = EventUserEntity::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'event_id',
        'user_id',
        'adults',
        'children',
        'children_ages',
        'checkin_by_user_id',
        'checkin_at',
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
    protected $afterFind      = [];
    protected $beforeDelete   = [];
    protected $afterDelete    = [];

    /**
     * Retrieves all user bookings for a given event, joined with user profile data.
     *
     * @param string $eventId The event ID to fetch bookings for.
     * @return array Array of EventUserEntity objects with joined user name, avatar, and auth_type.
     */
    public function getUsersByEventId(string $eventId): ?array
    {
        $eventUsersQuery = $this->select('
                events_users.adults, events_users.children, events_users.children_ages,
                events_users.created_at, users.name, users.avatar, users.auth_type')
            ->join('users', 'users.id = events_users.user_id', 'left')
            ->where('event_id', $eventId)
            ->orderBy('created_at', 'ASC')
            ->findAll();

        return $eventUsersQuery ?: [];
    }

    /**
     * Retrieves the total adult and child counts for a specific event.
     *
     * @param string $eventId The event ID to aggregate counts for.
     * @return object|null Object with total_adults and total_children properties, or null if not found.
     */
    public function getUsersCountByEventId(string $eventId): ?object
    {
        $eventUsersQuery = $this->select('
                SUM(events_users.adults) as total_adults,
                SUM(events_users.children) as total_children')
            ->where('event_id', $eventId)
            ->findAll();

        return $eventUsersQuery[0] ?: null;
    }

    /**
     * Returns aggregated statistics for a given event.
     *
     * Executes three queries:
     *  1. Overall aggregates (totals, check-in count, average age, gender split).
     *  2. Age-group distribution for participants whose birthdays are known.
     *  3. Daily registration counts, from which a cumulative timeline is computed in PHP.
     *
     * @param string $eventId The event ID to aggregate statistics for.
     * @return array Associative array with keys: totalRegistrations, totalAdults,
     *               totalChildren, totalParticipants, checkinCount, averageAge,
     *               genderStats, ageGroups, registrationTimeline.
     */
    public function getStatisticByEventId(string $eventId): array
    {
        // --- Query 1: overall aggregates ---
        $aggregates = $this->db->table('events_users eu')
            ->select('
                COUNT(eu.id)                                                   AS total_registrations,
                SUM(eu.adults)                                                 AS total_adults,
                SUM(eu.children)                                               AS total_children,
                SUM(eu.adults + eu.children)                                   AS total_participants,
                COUNT(eu.checkin_at)                                           AS checkin_count,
                AVG(TIMESTAMPDIFF(YEAR, u.birthday, CURDATE()))                AS average_age,
                SUM(CASE WHEN u.sex = \'m\' THEN 1 ELSE 0 END)               AS gender_male,
                SUM(CASE WHEN u.sex = \'f\' THEN 1 ELSE 0 END)               AS gender_female,
                SUM(CASE WHEN u.sex IS NULL THEN 1 ELSE 0 END)                AS gender_unknown')
            ->join('users u', 'u.id = eu.user_id', 'left')
            ->where('eu.event_id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->get()
            ->getRow();

        // --- Query 2: age groups ---
        $ageGroupRows = $this->db->table('events_users eu')
            ->select("
                CASE
                    WHEN TIMESTAMPDIFF(YEAR, u.birthday, CURDATE()) < 18  THEN 'under18'
                    WHEN TIMESTAMPDIFF(YEAR, u.birthday, CURDATE()) <= 25 THEN '18to25'
                    WHEN TIMESTAMPDIFF(YEAR, u.birthday, CURDATE()) <= 35 THEN '26to35'
                    WHEN TIMESTAMPDIFF(YEAR, u.birthday, CURDATE()) <= 50 THEN '36to50'
                    ELSE 'over50'
                END AS age_group,
                COUNT(*) AS count")
            ->join('users u', 'u.id = eu.user_id', 'left')
            ->where('eu.event_id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->where('u.birthday IS NOT NULL')
            ->groupBy('age_group')
            ->get()
            ->getResultArray();

        // Normalise age groups: ensure all buckets are present with zero counts
        $ageGroupOrder  = ['under18', '18to25', '26to35', '36to50', 'over50'];
        $ageGroupLookup = [];
        foreach ($ageGroupRows as $row) {
            $ageGroupLookup[$row['age_group']] = (int) $row['count'];
        }
        $ageGroups = [];
        foreach ($ageGroupOrder as $bucket) {
            $ageGroups[] = [
                'group' => $bucket,
                'count' => $ageGroupLookup[$bucket] ?? 0,
            ];
        }

        // --- Query 3: individual registration timeline ---
        $timelineRows = $this->db->table('events_users eu')
            ->select('eu.created_at AS reg_datetime')
            ->where('eu.event_id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->orderBy('reg_datetime', 'ASC')
            ->get()
            ->getResultArray();

        // Each row gets cumulative count = its 1-based position
        $timeline = [];
        foreach ($timelineRows as $i => $row) {
            $timeline[] = [
                'datetime'   => $row['reg_datetime'],
                'cumulative' => $i + 1,
            ];
        }

        return [
            'totalRegistrations'   => (int) ($aggregates->total_registrations ?? 0),
            'totalAdults'          => (int) ($aggregates->total_adults ?? 0),
            'totalChildren'        => (int) ($aggregates->total_children ?? 0),
            'totalParticipants'    => (int) ($aggregates->total_participants ?? 0),
            'checkinCount'         => (int) ($aggregates->checkin_count ?? 0),
            'averageAge'           => $aggregates->average_age !== null
                ? round((float) $aggregates->average_age, 1)
                : null,
            'genderStats'          => [
                'male'    => (int) ($aggregates->gender_male ?? 0),
                'female'  => (int) ($aggregates->gender_female ?? 0),
                'unknown' => (int) ($aggregates->gender_unknown ?? 0),
            ],
            'ageGroups'            => $ageGroups,
            'registrationTimeline' => $timeline,
        ];
    }

    /**
     * Retrieves total adult and child counts grouped by event ID across all events.
     *
     * @return array Array of objects with event_id, total_adults, and total_children.
     */
    public function getUsersCountGroupedByEventId(): array
    {
        return $this->select('
                event_id,
                SUM(events_users.adults) as total_adults,
                SUM(events_users.children) as total_children')
            ->groupBy('event_id')
            ->findAll();
    }

    /**
     * Returns users with valid emails registered for an event, for use as mailing recipients.
     *
     * @param string $eventId
     * @return array Rows with id, email, locale.
     */
    public function getMailingRecipientsByEventId(string $eventId): array
    {
        return $this->db->table('events_users eu')
            ->select('DISTINCT u.id, u.email, COALESCE(u.locale, \'ru\') as locale', false)
            ->join('users u', 'eu.user_id = u.id')
            ->where('eu.event_id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->where('u.email IS NOT NULL')
            ->where("u.email != ''")
            ->where('u.deleted_at IS NULL')
            ->get()
            ->getResultArray();
    }

    /**
     * Returns event title and count of registered users with valid emails for a specific event.
     *
     * @param string $eventId
     * @return array|null Row with title_ru, title_en, user_count or null if not found.
     */
    public function getMailingAudienceByEventId(string $eventId): ?array
    {
        return $this->db->table('events e')
            ->select('e.title_ru, e.title_en, COUNT(DISTINCT eu.user_id) as user_count')
            ->join('events_users eu', 'eu.event_id = e.id')
            ->join('users u', 'eu.user_id = u.id')
            ->where('e.id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->where('u.email IS NOT NULL')
            ->where("u.email != ''")
            ->where('u.deleted_at IS NULL')
            ->get()
            ->getRowArray() ?: null;
    }

    /**
     * Returns all events with at least one registered user with a valid email,
     * ordered newest first; used for mailing audience selection.
     *
     * @return array Rows with event_id, title_ru, title_en, user_count.
     */
    public function getMailingAudienceEvents(): array
    {
        return $this->db->table('events e')
            ->select('e.id as event_id, e.title_ru, e.title_en, COUNT(DISTINCT eu.user_id) as user_count')
            ->join('events_users eu', 'eu.event_id = e.id')
            ->join('users u', 'eu.user_id = u.id')
            ->where('eu.deleted_at IS NULL')
            ->where('u.email IS NOT NULL')
            ->where("u.email != ''")
            ->where('u.deleted_at IS NULL')
            ->groupBy('e.id')
            ->having('user_count >', 0)
            ->orderBy('e.created_at', 'DESC')
            ->get()
            ->getResultArray();
    }

    /**
     * Returns the next upcoming event that the given user is registered for.
     *
     * @param string $userId The user's ID.
     * @return object|null A result row with event and booking details, or null if none found.
     */
    public function getUpcomingRegisteredEvent(string $userId): ?object
    {
        return $this->db->table('events_users eu')
            ->select('e.id, e.title_ru, e.title_en, e.date, e.cover_file_name, e.cover_file_ext,
                      e.location_ru, e.location_en, e.yandex_map_link, e.google_map_link,
                      eu.adults, eu.children, eu.checkin_at')
            ->join('events e', 'e.id = eu.event_id')
            ->where('eu.user_id', $userId)
            ->where('eu.deleted_at IS NULL')
            ->where('e.deleted_at IS NULL')
            ->where('e.date > NOW()')
            ->orderBy('e.date', 'ASC')
            ->limit(1)
            ->get()
            ->getRow();
    }
}
