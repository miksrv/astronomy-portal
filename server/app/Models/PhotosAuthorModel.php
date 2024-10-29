<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Entities\PhotosAuthorEntity;

class PhotosAuthorModel extends ApplicationBaseModel
{
    protected $table      = 'photos_authors';
    protected $primaryKey = 'id';
    protected $returnType = PhotosAuthorEntity::class;
    protected $useSoftDeletes = true;

    protected $allowedFields = [
        'id',
        'user_id',
        'name',
        'link',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $validationRules = [
        'name'    => 'max_length[200]',
        'link'    => 'max_length[200]',
        'user_id' => 'max_length[15]',
    ];

    protected $validationMessages = [
        'name' => [
            'max_length' => 'Name cannot exceed 200 characters.',
        ],
        'link' => [
            'max_length' => 'Link cannot exceed 200 characters.',
        ],
        'user_id' => [
            'max_length' => 'User ID cannot exceed 15 characters.',
        ],
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];
}
