<?php

namespace App\Models;

use App\Entities\PhotosCategoryEntity;

class PhotosCategoryModel extends ApplicationBaseModel
{
    protected $table      = 'photos_categories';
    protected $primaryKey = 'id';
    protected $returnType = PhotosCategoryEntity::class;

    protected $allowedFields = [
        'photo_id',
        'category_id',
    ];

    protected $validationRules = [
        'photo_id'    => 'required|max_length[15]',
        'category_id' => 'required|is_natural_no_zero',
    ];

    protected $validationMessages = [
        'photo_id' => [
            'required'   => 'Photo ID is required.',
            'max_length' => 'Photo ID cannot exceed 15 characters.',
        ],
        'category_id' => [
            'required'           => 'Category ID is required.',
            'is_natural_no_zero' => 'Category ID must be a positive integer.',
        ],
    ];

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
