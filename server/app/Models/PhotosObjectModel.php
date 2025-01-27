<?php

namespace App\Models;

use App\Entities\PhotosObjectEntity;

class PhotosObjectModel extends ApplicationBaseModel
{
    protected $table      = 'photos_objects';
    protected $primaryKey = 'id';
    protected $returnType = PhotosObjectEntity::class;

    protected $allowedFields = [
        'photo_id',
        'object_id',
    ];

    protected $validationRules = [
        'photo_id'  => 'required|max_length[15]',
        'object_id' => 'required|max_length[255]',
    ];

    protected $validationMessages = [
        'photo_id' => [
            'required'   => 'Photo ID is required.',
            'max_length' => 'Photo ID cannot exceed 15 characters.',
        ],
        'object_id' => [
            'required'   => 'Object ID is required.',
            'max_length' => 'Object ID cannot exceed 255 characters.',
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
