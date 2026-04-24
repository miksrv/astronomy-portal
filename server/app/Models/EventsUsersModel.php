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
