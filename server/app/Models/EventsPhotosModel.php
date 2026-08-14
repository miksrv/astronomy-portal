<?php

namespace App\Models;

use App\Entities\EventPhotoEntity;

/**
 * EventsPhotosModel
 *
 * Manages the `events_photos` table, which stores photos uploaded by users
 * as part of a specific stargazing event. Supports soft deletes and UUID PKs.
 * Timestamps are managed by the application (not CI4 auto-timestamps) so
 * $useTimestamps is false, but the soft-delete deleted_at column is declared
 * explicitly via $deletedField.
 */
class EventsPhotosModel extends ApplicationBaseModel
{
    protected $table            = 'events_photos';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = EventPhotoEntity::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'event_id',
        'user_id',
        'photographer_name',
        'taken_at',
        'file_name',
        'file_ext',
        'file_size',
        'image_width',
        'image_height',
    ];

    // Dates — timestamps are not auto-managed, but deleted_at is required for soft deletes.
    protected $useTimestamps = false;
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

    private const MAX_LIMIT = 500;

    /**
     * Retrieves a paginated and optionally ordered list of event photos.
     *
     * When $eventId is provided the results are scoped to that event. When
     * $photographer is provided the results are further scoped to that exact
     * photographer credit. When $order is 'rand' the rows are returned in
     * random order; every other case (including no $order at all, or an
     * explicit 'date') sorts by capture date ascending — falling back to the
     * upload time for photos with no EXIF timestamp — so the gallery reads in
     * the order the photos were actually taken, not the order they happened
     * to be uploaded in. The $limit is capped at MAX_LIMIT for safety,
     * regardless of whether the list is scoped to one event.
     *
     * @param string|null $eventId      Optional event ID to filter results.
     * @param int|null    $limit        Maximum number of rows to return. Default is 20.
     * @param int|null    $offset       Number of rows to skip, for pagination. Default is 0.
     * @param string|null $order        Sort order: 'rand' for random, anything else for date ascending.
     * @param string|null $photographer Optional exact photographer credit to filter by.
     * @return array Array of EventPhotoEntity objects.
     */
    public function getPhotoList(
        ?string $eventId = null,
        ?int $limit = 20,
        ?int $offset = 0,
        ?string $order = null,
        ?string $photographer = null
    ): ?array {
        $photosQuery = $this->select('id, event_id, photographer_name, taken_at, file_name, file_ext, image_width, image_height');

        if ($eventId) {
            $photosQuery->where('event_id', $eventId);
        }

        if ($photographer) {
            $photosQuery->where('photographer_name', $photographer);
        }

        // A requested limit above MAX_LIMIT is clamped to it, not discarded
        // in favor of the small default — otherwise callers asking for "all"
        // photos of an event with e.g. 150 items would silently get 20 back.
        $photosQuery->limit(
            is_numeric($limit) && $limit > 0 ? min((int) $limit, self::MAX_LIMIT) : 20,
            is_numeric($offset) && $offset > 0 ? (int) $offset : 0
        );

        if ($order === 'rand') {
            $photosQuery->orderBy('RAND()');
        } else {
            // Capture date ascending, falling back to upload time when the
            // photo has no EXIF timestamp. $escape must be explicitly false
            // here - CI4's orderBy() otherwise splits the raw expression on
            // its internal comma (treating it as multiple order columns) and
            // mangles it into invalid SQL: `COALESCE(taken_at ASC, created_at) ASC`.
            $photosQuery->orderBy('COALESCE(taken_at, created_at)', 'ASC', false);
        }

        $photosList = $photosQuery->findAll();

        return $photosList ?: [];
    }

    /**
     * Counts event photos matching the same $eventId/$photographer scoping as
     * {@see getPhotoList()}, ignoring pagination — lets clients know the real
     * total so they know whether more pages remain.
     *
     * @param string|null $eventId      Optional event ID to filter results.
     * @param string|null $photographer Optional exact photographer credit to filter by.
     * @return int Total number of matching rows.
     */
    public function countPhotoList(?string $eventId = null, ?string $photographer = null): int
    {
        if ($eventId) {
            $this->where('event_id', $eventId);
        }

        if ($photographer) {
            $this->where('photographer_name', $photographer);
        }

        // Model::countAllResults() (unlike builder()->countAllResults()) is
        // what actually adds the `deleted_at IS NULL` condition for a
        // soft-deleting model - builder() alone would count deleted rows too.
        return $this->countAllResults();
    }

    /**
     * Returns the distinct, non-empty photographer credits for an event, used
     * to populate the gallery filter chips and the upload dialog's
     * autocomplete suggestions — independent of which page of photos happens
     * to be loaded, so a photographer whose photos only appear past the first
     * page still shows up as a filter option.
     *
     * @param string $eventId Event ID to scope the result to.
     * @return string[] Distinct photographer names, alphabetically sorted.
     */
    public function getDistinctPhotographers(string $eventId): array
    {
        // Raw builder(), not the Model's own find*() helpers - the
        // `deleted_at IS NULL` condition has to be added explicitly here,
        // since builder() (unlike findAll()/countAllResults()) doesn't inject
        // it automatically for a soft-deleting model.
        $rows = $this->builder()
            ->distinct()
            ->select('photographer_name')
            ->where('event_id', $eventId)
            ->where('photographer_name IS NOT NULL')
            ->where('deleted_at', null)
            ->orderBy('photographer_name', 'ASC')
            ->get()
            ->getResultArray();

        return array_column($rows, 'photographer_name');
    }
}
