<?php

namespace App\Models;

use App\Entities\ObjectCategoryEntity;

/**
 * ObjectCategoryModel
 *
 * Manages the `objects_categories` pivot table that maps astronomical objects
 * (by catalog_name) to their associated categories. Uses UUID primary keys
 * generated via the beforeInsert callback.
 */
class ObjectCategoryModel extends ApplicationBaseModel
{
    protected $table            = 'objects_categories';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = ObjectCategoryEntity::class;
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'object_name',
        'category_id',
    ];

    // Dates
    protected $useTimestamps = false;

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
}
