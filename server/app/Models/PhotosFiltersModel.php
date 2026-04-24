<?php

namespace App\Models;

use App\Entities\PhotosFiltersEntity;

/**
 * PhotosFiltersModel
 *
 * Manages the `photos_filters` table, which stores per-filter imaging statistics
 * (frame count, exposure time) for each astrophoto. The primary key is a VARCHAR(15)
 * string assigned by the generateId beforeInsert callback — not an auto-increment int.
 */
class PhotosFiltersModel extends ApplicationBaseModel
{
    protected $table            = 'photos_filters';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;  // PK is VARCHAR(15) per migration, not auto-increment.
    protected $returnType       = PhotosFiltersEntity::class;
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'photo_id',
        'filter',
        'frames_count',
        'exposure_time',
    ];

    // Dates
    protected $useTimestamps = false;

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
     * Retrieves the filter statistics record for a specific photo and filter combination.
     *
     * @param string $photo_id The photo ID to look up.
     * @param string $filter   The filter identifier (e.g. 'L', 'R', 'H').
     * @return PhotosFiltersEntity|null The matching entity, or null if not found.
     */
    public function getDataByPhotoFilter(string $photo_id, string $filter): ?PhotosFiltersEntity
    {
        return $this
            ->where('photo_id', $photo_id)
            ->where('filter', $filter)
            ->first();
    }
}
