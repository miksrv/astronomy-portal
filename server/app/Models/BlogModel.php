<?php namespace App\Models;

class BlogModel extends MyBaseModel
{
    protected $table      = 'blog';
    protected $primaryKey = 'id';

    protected $useAutoIncrement = true;

    protected $returnType     = \App\Entities\Blog::class;
    protected $useSoftDeletes = true;

    // The updatable fields
    protected $allowedFields = [
        'telegram_id', 'telegram_date', 'group_id',
        'views', 'forwards', 'replies', 'text', 'reactions'
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