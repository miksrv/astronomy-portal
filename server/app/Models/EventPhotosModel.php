<?php namespace App\Models;

class EventPhotosModel extends MyBaseModel {
    protected $table            = 'event_photos';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = \App\Entities\EventPhoto::class;
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'event_id',
        'user_id',
        'title',
        'filename',
        'extension',
        'filesize',
        'width',
        'height',
    ];

    protected bool $allowEmptyInserts = false;

    // Dates
    protected $useTimestamps = false;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    // Validation
    protected $validationRules      = [];
    protected $validationMessages   = [];
    protected $skipValidation       = true;
    protected $cleanValidationRules = true;

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
