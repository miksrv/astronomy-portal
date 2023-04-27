<?php namespace App\Models;

use CodeIgniter\Model;

class BlogMediaModel extends MyBaseModel
{
    protected $table      = 'blog_media';
    protected $primaryKey = 'id';

    protected $useAutoIncrement = true;

    protected $returnType     = \App\Entities\BlogMedia::class;
    protected $useSoftDeletes = true;

    // The updatable fields
    protected $allowedFields = [
        'blog_id', 'telegram_id', 'telegram_date', 'group_id',
        'views', 'forwards', 'file', 'height', 'width'
    ];

    protected array $hidden = ['created_at', 'updated_at', 'deleted_at'];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    // Validation
    protected $validationRules      = [];
    protected $validationMessages   = [];
    protected $skipValidation       = false;
    protected $cleanValidationRules = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = [];
    protected $afterInsert    = [];
    protected $beforeUpdate   = [];
    protected $afterUpdate    = [];
    protected $beforeFind     = [];
    protected $afterFind      = ['prepareOutput'];
    protected $beforeDelete   = [];
    protected $afterDelete    = [];
}