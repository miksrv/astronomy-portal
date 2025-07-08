<?php

namespace App\Models;

use App\Entities\EventPhotoEntity;

class EventsPhotosModel extends ApplicationBaseModel
{
    protected $table      = 'events_photos';
    protected $primaryKey = 'id';
    protected $returnType = EventPhotoEntity::class;

    protected $useAutoIncrement = false;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields    = [
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

    protected bool $allowEmptyInserts = false;

    protected $useTimestamps = false;
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

    /**
     * Retrieves a list of photos for a given event.
     *
     * @param string $locale The locale for the photo titles (default is 'ru').
     * @param string|null $eventId The ID of the event to filter photos by.
     * @param int|null $limit The maximum number of photos to retrieve (default is 20).
     * @param string|null $order The order in which to retrieve photos ('rand' for random, 'date' for date order).
     * @return array|null The list of photos, or an empty array if no photos are found.
     */
    public function getPhotoList(
        string $locale = 'ru',
        ?string $eventId,
        ?int $limit = 20,
        ?string $order = null
    ): ?array
    {
        helper('locale');

        // Base query
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

        // Localize titles based on the specified locale
        foreach ($photosList as $photo) {
            $photo->title = getLocalizedString($locale, $photo->title_en, $photo->title_ru);

            // Remove unnecessary fields
            unset($photo->title_en, $photo->title_ru);
        }

        return $photosList;
    }
}
