<?php

namespace App\Models;

use App\Entities\EventUserEntity;

class EventsUsersModel extends ApplicationBaseModel {
    protected $table      = 'events_users';
    protected $primaryKey = 'id';
    protected $returnType = EventUserEntity::class;

    protected $useSoftDeletes   = true;
    protected $protectFields    = true;
    protected $useAutoIncrement = false;

    protected $allowedFields    = [
        'event_id',
        'user_id',
        'adults',
        'children',
        'children_ages',
        'checkin_by_user_id',
        'checkin_at'
    ];

    protected bool $allowEmptyInserts = false;

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    protected $validationRules      = [];
    protected $validationMessages   = [];
    protected $skipValidation       = true;
    protected $cleanValidationRules = true;

    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];
    protected $afterInsert    = [];
    protected $beforeUpdate   = [];
    protected $afterUpdate    = [];
    protected $beforeFind     = [];
    protected $afterFind      = [];
    protected $beforeDelete   = [];
    protected $afterDelete    = [];

    public function getUsersByEventId(string $eventId): ?array {
        $eventUsersQuery = $this->select('
                events_users.adults, events_users.children, events_users.children_ages,
                events_users.created_at,users.name, users.avatar, users.auth_type')
            ->join('users', 'users.id = events_users.user_id', 'left')
            ->where('event_id', $eventId)
            ->orderBy('created_at', 'ASC')
            ->findAll();

        return $eventUsersQuery ?: [];
    }

    /**
     * Retrieves the count of users (adults and children) for a specific event.
     *
     * @param string $eventId The ID of the event.
     * @return array{total_adults: int|string|null, total_children: int|string|null}[]|null
     */
    public function getUsersCountByEventId(string $eventId): ?object {
        $eventUsersQuery = $this->select('
                SUM(events_users.adults) as total_adults,
                SUM(events_users.children) as total_children')
            ->where('event_id', $eventId)
            ->findAll();

        return $eventUsersQuery[0] ?: null;
    }

    /**
     * Retrieves the count of users (adults and children) for all events, grouped by event_id.
     *
     * @return array<int, array{event_id: string, total_adults: int|string|null, total_children: int|string|null}>
     */
    public function getUsersCountGroupedByEventId(): array {
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
     * @param string $userId
     * @return object|null
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
