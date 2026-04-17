<?php

namespace App\Models;

class CommentsModel extends ApplicationBaseModel
{
    protected $table      = 'comments';
    protected $primaryKey = 'id';
    protected $returnType = 'array';

    protected $useSoftDeletes   = true;
    protected $protectFields    = true;
    protected $useAutoIncrement = false;

    protected $allowedFields = [
        'id',
        'user_id',
        'entity_type',
        'entity_id',
        'content',
        'rating',
        'status',
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
    protected $beforeInsert   = [];
    protected $afterInsert    = [];
    protected $beforeUpdate   = [];
    protected $afterUpdate    = [];
    protected $beforeFind     = [];
    protected $afterFind      = [];
    protected $beforeDelete   = [];
    protected $afterDelete    = [];

    /**
     * Get visible comments for an entity, newest first, with author info joined.
     *
     * @param string $type     Entity type: 'event' or 'photo'
     * @param string $entityId Entity ID
     * @param int    $limit    Maximum number of results (default 20)
     * @return array
     */
    public function getForEntity(string $type, string $entityId, int $limit = 20): array
    {
        $rows = $this->db->table('comments c')
            ->select('c.id, c.user_id, c.entity_type, c.entity_id, c.content, c.rating, c.status, c.created_at, u.avatar, u.name AS author_name')
            ->join('users u', 'u.id = c.user_id', 'left')
            ->where('c.entity_type', $type)
            ->where('c.entity_id', $entityId)
            ->where('c.deleted_at IS NULL')
            ->where('c.status', 'visible')
            ->orderBy('c.created_at', 'DESC')
            ->limit($limit)
            ->get()
            ->getResultArray();

        return $this->formatRows($rows);
    }

    /**
     * Get N random visible comments of an entity type (for widget).
     *
     * @param string $type  Entity type: 'event' or 'photo'
     * @param int    $limit Maximum number of results (default 5)
     * @return array
     */
    public function getRandom(string $type, int $limit = 5): array
    {
        $rows = $this->db->table('comments c')
            ->select('c.id, c.user_id, c.entity_type, c.entity_id, c.content, c.rating, c.status, c.created_at, u.avatar, u.name AS author_name')
            ->join('users u', 'u.id = c.user_id', 'left')
            ->where('c.entity_type', $type)
            ->where('c.deleted_at IS NULL')
            ->where('c.status', 'visible')
            ->orderBy('RAND()')
            ->limit($limit)
            ->get()
            ->getResultArray();

        return $this->formatRows($rows);
    }

    private function formatRows(array $rows, bool $keepEntity = false): array
    {
        foreach ($rows as &$row) {
            $row['createdAt'] = $row['created_at'] ?? null;
            $row['author'] = [
                'id'     => $row['user_id'] ?? null,
                'name'   => $this->truncateAuthorName((string) ($row['author_name'] ?? '')),
                'avatar' => $row['avatar'] ?? null,
            ];

            if ($keepEntity) {
                $row['entityType'] = $row['entity_type'] ?? null;
                $row['entityId']   = $row['entity_id'] ?? null;
            }

            unset($row['created_at'], $row['author_name'], $row['avatar'], $row['user_id'],
                  $row['entity_type'], $row['entity_id'], $row['status']);
        }
        unset($row);

        return $rows;
    }

    /**
     * Get comments written by a specific user.
     *
     * @param string $userId
     * @return array
     */
    public function getByUser(string $userId): array
    {
        $rows = $this->db->table('comments c')
            ->select('c.id, c.user_id, c.entity_type, c.entity_id, c.content, c.rating, c.status, c.created_at, u.avatar, u.name AS author_name')
            ->join('users u', 'u.id = c.user_id', 'left')
            ->where('c.user_id', $userId)
            ->where('c.deleted_at IS NULL')
            ->orderBy('c.created_at', 'DESC')
            ->get()
            ->getResultArray();

        return $this->formatRows($rows, true);
    }

    /**
     * Check if a user is eligible to review an event.
     * Eligible means the user has booked the event AND either checked in OR the event date is in the past.
     *
     * @param string $userId
     * @param string $eventId
     * @return bool
     */
    public function canReviewEvent(string $userId, string $eventId): bool
    {
        $count = $this->db->table('events_users eu')
            ->join('events e', 'e.id = eu.event_id')
            ->where('eu.user_id', $userId)
            ->where('eu.event_id', $eventId)
            ->where('eu.deleted_at IS NULL')
            ->groupStart()
                ->where('eu.checkin_at IS NOT NULL')
                ->orWhere('e.date <', date('Y-m-d H:i:s'))
            ->groupEnd()
            ->countAllResults();

        return $count > 0;
    }

    /**
     * Check if a user has already reviewed a specific entity.
     *
     * @param string $userId
     * @param string $type
     * @param string $entityId
     * @return bool
     */
    public function hasReviewed(string $userId, string $type, string $entityId): bool
    {
        $count = $this->db->table('comments')
            ->where('user_id', $userId)
            ->where('entity_type', $type)
            ->where('entity_id', $entityId)
            ->where('deleted_at IS NULL')
            ->countAllResults();

        return $count > 0;
    }

    /**
     * Truncate an author's full name to "FirstName L." format for privacy.
     *
     * @param string $name
     * @return string
     */
    private function truncateAuthorName(string $name): string
    {
        if (empty(trim($name))) {
            return '';
        }

        $parts = explode(' ', trim($name));

        if (count($parts) === 1) {
            return $parts[0];
        }

        $firstName    = $parts[0];
        $lastInitial  = mb_substr($parts[1], 0, 1, 'UTF-8');

        return $firstName . ' ' . $lastInitial . '.';
    }
}
