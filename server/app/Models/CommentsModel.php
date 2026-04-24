<?php

namespace App\Models;

/**
 * CommentsModel
 *
 * Manages the `comments` table, which stores user reviews and comments on
 * events and photos. Supports soft deletes, UUID primary keys, and an
 * `entity_type` / `entity_id` polymorphic relationship pattern.
 */
class CommentsModel extends ApplicationBaseModel
{
    protected $table            = 'comments';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'id',
        'user_id',
        'entity_type',
        'entity_id',
        'content',
        'rating',
        'status',
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
     * @param string $type     Entity type ('event' or 'photo').
     * @param string $entityId Entity ID.
     * @param int    $limit    Maximum number of results. Default is 20.
     * @return array Array of formatted comment rows.
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
     * Get N random visible comments of a given entity type (used for widgets).
     *
     * @param string $type  Entity type ('event' or 'photo').
     * @param int    $limit Maximum number of results. Default is 5.
     * @return array Array of formatted comment rows.
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

    /**
     * Get all comments written by a specific user, including entity references.
     *
     * @param string $userId The user's ID.
     * @return array Array of formatted comment rows with entityType and entityId included.
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
     * Check whether a user is eligible to review an event.
     *
     * Eligible means the user has a non-cancelled booking AND either checked in
     * or the event date is in the past.
     *
     * @param string $userId  The user's ID.
     * @param string $eventId The event's ID.
     * @return bool True if the user may submit a review.
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
     * Check whether a user has already submitted a review for a specific entity.
     *
     * @param string $userId   The user's ID.
     * @param string $type     Entity type ('event' or 'photo').
     * @param string $entityId The entity's ID.
     * @return bool True if a non-deleted review already exists.
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
     * Normalise raw DB rows into the camelCase API shape with an embedded author object.
     *
     * @param array $rows      Raw result rows from the query builder.
     * @param bool  $keepEntity Whether to include entityType/entityId in the output.
     * @return array Formatted rows.
     */
    private function formatRows(array $rows, bool $keepEntity = false): array
    {
        foreach ($rows as &$row) {
            $row['createdAt'] = $row['created_at'] ?? null;
            $row['author']    = [
                'id'     => $row['user_id'] ?? null,
                'name'   => $this->truncateAuthorName((string) ($row['author_name'] ?? '')),
                'avatar' => $row['avatar'] ?? null,
            ];

            if ($keepEntity) {
                $row['entityType'] = $row['entity_type'] ?? null;
                $row['entityId']   = $row['entity_id'] ?? null;
            }

            unset(
                $row['created_at'], $row['author_name'], $row['avatar'], $row['user_id'],
                $row['entity_type'], $row['entity_id'], $row['status']
            );
        }
        unset($row);

        return $rows;
    }

    /**
     * Truncate an author's full name to "FirstName L." format for privacy.
     *
     * @param string $name Full name string.
     * @return string Truncated name, or the original first token if no last name is present.
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

        $firstName   = $parts[0];
        $lastInitial = mb_substr($parts[1], 0, 1, 'UTF-8');

        return $firstName . ' ' . $lastInitial . '.';
    }
}
