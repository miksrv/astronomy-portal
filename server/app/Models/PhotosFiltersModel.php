<?php

namespace App\Models;

use App\Entities\PhotosFiltersEntity;

class PhotosFiltersModel extends ApplicationBaseModel
{
    protected $table      = 'photos_filters';
    protected $primaryKey = 'id';

    protected $useAutoIncrement = true;

    protected $returnType     = PhotosFiltersEntity::class;
    protected $useSoftDeletes = false;

    protected $allowedFields = [
        'photo_id',
        'filter',
        'frames_count',
        'exposure_time'
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected $useTimestamps = false;

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
     * Retrieves the FITS filter data for a given photo and filter.
     *
     * This function queries the database for the record that matches
     * the specified photo and filter. If found, it returns an
     * instance of PhotosFiltersEntity, otherwise returns null.
     *
     * @param string $photo_id The ID of the photo for which to retrieve the filter data.
     * @param string $filter The name of the filter to retrieve data for.
     *
     * @return PhotosFiltersEntity|null Returns the filter data as an PhotosFiltersEntity or null if no matching record is found.
     */
    public function getDataByPhotoFilter(string $photo_id, string $filter): ?PhotosFiltersEntity
    {
        return $this
            ->where('photo_id', $photo_id)
            ->where('filter', $filter)
            ->first();
    }
}
