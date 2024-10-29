<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Entities\ObjectCategoryEntity;

class ObjectCategoryModel extends Model
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
}
