<?php

namespace App\Libraries;

use App\Entities\UserEntity;
use App\Models\UsersModel;
use Config\Services;
use ReflectionException;

class SessionLibrary
{
    public UserEntity | null $user = null;
    public bool $isAuth = false;

    private \CodeIgniter\HTTP\IncomingRequest|\CodeIgniter\HTTP\CLIRequest $request;

    public function __construct()
    {
        helper('auth');

        $this->request = Services::request();

        $token = $this->request->getServer('HTTP_AUTHORIZATION') ?? null;

        $this->user = validateAuthToken($token);

        if ($this->user) {
            $this->isAuth = true;
        }
    }

    /**
     * @throws ReflectionException
     */
    public function authorization(UserEntity $user): static
    {
        $this->user   = $user;
        $this->isAuth = true;
        $this->update();

        return $this;
    }

    /**
     * @throws ReflectionException
     */
    public function update(): static
    {
        if ($this->user) {
            $usersModel = new UsersModel();
            $usersModel->updateUserActivity($this->user->id);
        }

        return $this;
    }
}
