<?php

namespace App\Models;

use App\Entities\ObjectCategoryEntity;

class ObjectCategoryModel extends ApplicationBaseModel
{
    protected $table      = 'objects_categories';
    protected $primaryKey = 'id';
    protected $returnType = ObjectCategoryEntity::class;

    protected $allowedFields = [
        'object_name',
        'category_id',
    ];

    protected $useSoftDeletes = false;

    protected $useTimestamps = false;

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
