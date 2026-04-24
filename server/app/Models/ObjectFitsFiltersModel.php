<?php

namespace App\Models;

use App\Entities\ObjectFitsFiltersEntity;

/**
 * ObjectFitsFiltersModel
 *
 * Manages the `objects_fits_filters` table, which stores aggregated filter statistics
 * (frame count, exposure time, file size) derived from FITS files per astronomical object.
 * Supports soft deletes and UUID primary keys generated via the beforeInsert callback.
 */
class ObjectFitsFiltersModel extends ApplicationBaseModel
{
    protected $table            = 'objects_fits_filters';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;  // PK is VARCHAR(15) assigned by generateId callback.
    protected $returnType       = ObjectFitsFiltersEntity::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'object_name',
        'filter',
        'frames_count',
        'exposure_time',
        'files_size',
    ];

    /** @var array<string> Fields stripped from query results by the prepareOutput afterFind callback. */
    protected array $hiddenFields = ['created_at', 'updated_at', 'deleted_at'];

    // Dates
    protected $useTimestamps = true;
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
     * Retrieves the filter statistics record for a specific object and filter combination.
     *
     * @param string $object The astronomical object name (catalog name).
     * @param string $filter The filter identifier (e.g. 'L', 'R', 'H').
     * @return ObjectFitsFiltersEntity|null The matching entity, or null if not found.
     */
    public function getDataByObjectFilter(string $object, string $filter): ?ObjectFitsFiltersEntity
    {
        return $this
            ->where('object_name', $object)
            ->where('filter', $filter)
            ->first();
    }
}
