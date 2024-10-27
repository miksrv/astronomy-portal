<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Entities\EventEntity;

class EventsModel extends ApplicationBaseModel {
    protected $table      = 'events';
    protected $primaryKey = 'id';
    protected $returnType = EventEntity::class;

    protected $useSoftDeletes   = true;
    protected $protectFields    = true;
    protected $useAutoIncrement = false;

    protected $allowedFields    = [
        'title',
        'content',
        'cover',
        'max_tickets',
        'yandex_map_link',
        'registration_start',
        'registration_end',
        'date',
    ];

    protected bool $allowEmptyInserts = false;

    protected $useTimestamps = true;
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
