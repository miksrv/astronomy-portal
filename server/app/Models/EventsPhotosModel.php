<?php

namespace App\Models;

use App\Entities\EventPhotoEntity;

class EventsPhotosModel extends ApplicationBaseModel
{
    protected $table      = 'events_photos';
    protected $primaryKey = 'id';
    protected $returnType = EventPhotoEntity::class;

    protected $useAutoIncrement = false;
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

    protected $useTimestamps = false;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    protected $validationRules      = [];
    protected $validationMessages   = [];
    protected $skipValidation       = true;
    protected $cleanValidationRules = true;

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
