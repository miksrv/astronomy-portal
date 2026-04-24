<?php

namespace App\Models;

use App\Entities\PhotosAuthorEntity;

/**
 * PhotosAuthorModel
 *
 * Manages the `photos_authors` table, which stores author attribution records
 * for astrophotos. Authors may be linked to a registered user account via
 * `user_id` or stored as anonymous entries. Supports soft deletes and UUID PKs.
 */
class PhotosAuthorModel extends ApplicationBaseModel
{
    protected $table            = 'photos_authors';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = PhotosAuthorEntity::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;

    protected $allowedFields = [
        'id',
        'user_id',
        'name',
        'link',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    // Dates
    protected $useTimestamps = true;
    protected $createdField       = 'created_at';
    protected $updatedField       = 'updated_at';
    protected $deletedField       = 'deleted_at';

    // Validation
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

    /** @var array<string, string> CI4 model-level casts for timestamp fields. */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

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
