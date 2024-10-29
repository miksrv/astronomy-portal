<?php

namespace App\Models;

use App\Entities\PhotoEntity;

class PhotosModel extends ApplicationBaseModel
{
    protected $table      = 'photos';
    protected $primaryKey = 'id';
    protected $returnType = PhotoEntity::class;
    protected $useSoftDeletes = true;

    protected $allowedFields = [
        'id',
        'date',
        'author_id',
        'file_name',
        'file_ext',
        'file_size',
        'image_width',
        'image_height',
        'equipment_info',
        'exposures_filters',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $validationRules = [
        'file_name'    => 'required|max_length[50]',
        'file_ext'     => 'required|max_length[5]',
        'file_size'    => 'integer',
        'image_width'  => 'integer',
        'image_height' => 'integer',
    ];

    protected $validationMessages = [
        'file_name' => [
            'required'   => 'The file name is required.',
            'max_length' => 'The file name cannot exceed 50 characters.',
        ],
        'file_ext' => [
            'required'   => 'The file extension is required.',
            'max_length' => 'The file extension cannot exceed 5 characters.',
        ],
        'file_size' => [
            'integer' => 'File size must be an integer.',
        ],
        'image_width' => [
            'integer' => 'Image width must be an integer.',
        ],
        'image_height' => [
            'integer' => 'Image height must be an integer.',
        ],
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    protected $casts = [
        'file_size'    => 'integer',
        'image_width'  => 'integer',
        'image_height' => 'integer',
        'created_at'   => 'datetime',
        'updated_at'   => 'datetime',
        'deleted_at'   => 'datetime',
    ];

    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];
}
