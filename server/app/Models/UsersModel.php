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
        'phone',
        'avatar',
        'auth_type',
        'role',
        'locale',
        'sex',
        'birthday',
        'service_id',
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
     * Finds a user by their email address.
     *
     * @param string $emailAddress The email address to search for.
     * @return UserEntity|array|null The user entity or an array of user data, or null if not found.
     */
    public function findUserByEmailAddress(string $emailAddress): UserEntity | array | null
    {
        return $this
            ->select('id, name, avatar, email, auth_type, role, locale')
            ->where('email', $emailAddress)
            ->first();
    }

    /**
     * Updates the user's activity timestamp.
     * Debounced: skips the update if activity was recorded less than 5 minutes ago.
     *
     * @param string $userId
     * @return void
     * @throws ReflectionException
     * @throws Exception
     */
    public function updateUserActivity(string $userId): void
    {
        $user = $this->select('activity_at')->find($userId);

        if ($user && $user->activity_at && (time() - strtotime((string) $user->activity_at)) < 300) {
            return; // Skip update — activity was updated less than 5 minutes ago
        }

        $this->update($userId, ['activity_at' => Time::now()]);
    }
}
