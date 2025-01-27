<?php

namespace App\Models;

use App\Entities\ObjectFitsFiltersEntity;

class ObjectFitsFiltersModel extends ApplicationBaseModel
{
    protected $table      = 'objects_fits_filters';
    protected $primaryKey = 'id';

    protected $useAutoIncrement = true;

    protected $returnType     = ObjectFitsFiltersEntity::class;
    protected $useSoftDeletes = true;

    protected $allowedFields = [
        'object_name',
        'filter',
        'frames_count',
        'exposure_time',
        'files_size'
    ];

    protected array $hiddenFields = ['created_at', 'updated_at', 'deleted_at'];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

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
     * Retrieves the FITS filter data for a given object and filter.
     *
     * This function queries the database for the record that matches
     * the specified object and filter. If found, it returns an
     * instance of ObjectFitsFiltersEntity, otherwise returns null.
     *
     * @param string $object The name of the object for which to retrieve the filter data.
     * @param string $filter The name of the filter to retrieve data for.
     *
     * @return ObjectFitsFiltersEntity|null Returns the filter data as an ObjectFitsFiltersEntity or null if no matching record is found.
     */
    public function getDataByObjectFilter(string $object, string $filter): ?ObjectFitsFiltersEntity
    {
        return $this
            ->where('object_name', $object)
            ->where('filter', $filter)
            ->first();
    }
}
