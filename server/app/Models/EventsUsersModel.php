<?php

namespace App\Models;

use App\Entities\EventUserEntity;

class EventsUsersModel extends ApplicationBaseModel {
    protected $table      = 'events_users';
    protected $primaryKey = 'id';
    protected $returnType = \App\Entities\EventUserEntity::class;

    protected $useSoftDeletes   = true;
    protected $protectFields    = true;
    protected $useAutoIncrement = false;

    protected $allowedFields    = [
        'event_id',
        'user_id',
        'adults',
        'children',
        'children_ages'
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

    public function getUsersByEventId(string $eventId): ?array {
        $eventUsersQuery = $this->select('
                events_users.adults, events_users.children, events_users.children_ages,
                events_users.created_at,users.name, users.avatar, users.auth_type')
            ->join('users', 'users.id = events_users.user_id', 'left')
            ->where('event_id', $eventId)
            ->orderBy('created_at', 'ASC')
            ->findAll();

        return $eventUsersQuery ?: [];
    }
}
