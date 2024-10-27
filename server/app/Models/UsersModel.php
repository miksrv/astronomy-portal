<?php

namespace App\Models;

use App\Entities\UserEntity;
use CodeIgniter\I18n\Time;
use Exception;
use ReflectionException;

class UsersModel extends ApplicationBaseModel {
    protected $table            = 'users';
    protected $primaryKey       = 'id';
    protected $returnType       = UserEntity::class;
    protected $useAutoIncrement = false;
    protected $useSoftDeletes   = true;

    protected array $hiddenFields = ['deleted_at'];

    protected $allowedFields = [
        'name',
        'email',
        'password',
        'role',
        'auth_type',
        'language',
        'experience',
        'level',
        'avatar',
        'website',
        'reputation',
        'settings',
        'created_at',
        'updated_at',
        'activity_at',
    ];

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
    protected $afterFind      = ['prepareOutput'];
    protected $beforeDelete   = [];
    protected $afterDelete    = [];

    /**
     * @param string $emailAddress
     * @return UserEntity|array|null
     */
    public function findUserByEmailAddress(string $emailAddress): UserEntity | array | null
    {
        return $this
            ->select('id, name, avatar, email, password, auth_type, role, locale, settings, level, experience')
            ->where('email', $emailAddress)
            ->first();
    }

    /**
     * @param string $userId
     * @return void
     * @throws ReflectionException
     * @throws Exception
     */
    public function updateUserActivity(string $userId): void
    {
        $userData = $this->select('updated_at')->find($userId);

        $user = new UserEntity();
        $user->updated_at  = $userData->updated_at;
        $user->activity_at = Time::now();

        $this->update($userId, $user);
    }
}