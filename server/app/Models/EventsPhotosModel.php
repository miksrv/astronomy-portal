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
        'title_ru',
        'title_en',
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

    /**
     * Retrieves a paginated and optionally ordered list of event photos.
     *
     * When $eventId is provided the results are scoped to that event. When
     * $order is 'rand' the rows are returned in random order; 'date' orders
     * by the created date ascending. The $limit is capped at 100 for safety.
     *
     * @param string      $locale  Locale code for title selection ('ru' or 'en'). Default is 'ru'.
     * @param string|null $eventId Optional event ID to filter results.
     * @param int|null    $limit   Maximum number of rows to return. Default is 20.
     * @param string|null $order   Sort order: 'rand' for random, 'date' for date ascending.
     * @return array Array of EventPhotoEntity objects with a localised title field.
     */
    public function getPhotoList(
        string $locale = 'ru',
        ?string $eventId = null,
        ?int $limit = 20,
        ?string $order = null
    ): ?array {
        helper('locale');

        $photosQuery = $this->select('id, event_id, title_ru, title_en, file_name, file_ext, image_width, image_height');

        if ($eventId) {
            $photosQuery->where('event_id', $eventId);
        }

        if ($eventId && (is_numeric($limit) && $limit > 0)) {
            $photosQuery->limit($limit);
        }

        if (!$eventId) {
            $photosQuery->limit(($limit > 0 && $limit <= 100) ? $limit : 20);
        }

        if ($order !== null && in_array($order, ['rand', 'date'])) {
            $photosQuery->orderBy($order === 'rand' ? 'RAND()' : 'date');
        }

        $photosList = $photosQuery->findAll();

        if (empty($photosList)) {
            return [];
        }

        foreach ($photosList as $photo) {
            $photo->title = getLocalizedString($locale, $photo->title_en, $photo->title_ru);
            unset($photo->title_en, $photo->title_ru);
        }

        return $photosList;
    }
}
