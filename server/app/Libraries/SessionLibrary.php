<?php

namespace App\Libraries;

use App\Entities\UserEntity;
use App\Enums\Permission;
use App\Models\RolesModel;
use App\Models\UsersModel;
use Config\Services;
use ReflectionException;

class SessionLibrary
{
    public UserEntity | null $user = null;
    public bool $isAuth = false;

    /** @var array<string> Flat, deduplicated union of privileges granted by every role $user has. */
    public array $permissions = [];

    private \CodeIgniter\HTTP\IncomingRequest|\CodeIgniter\HTTP\CLIRequest $request;

    public function __construct()
    {
        helper('auth');

        $this->request = Services::request();

        $token = $this->request->getServer('HTTP_AUTHORIZATION') ?? null;

        $this->user = validateAuthToken($token);

        if ($this->user) {
            $this->isAuth = true;
            $this->loadPermissions();
            $this->update();
        }
    }

    /**
     * @throws ReflectionException
     */
    public function authorization(UserEntity $user): static
    {
        $this->user   = $user;
        $this->isAuth = true;
        $this->loadPermissions();
        $this->update();

        return $this;
    }

    /**
     * Resolves $this->permissions from $this->user->roles (a list of
     * roles.id values) — the union of every privilege any of those roles
     * grants. Re-read from the DB on every request/authorization, same as
     * the rest of the user row, so a role/privilege change applies instantly
     * without waiting for the JWT to expire.
     */
    private function loadPermissions(): void
    {
        if (!$this->user) {
            $this->permissions = [];
            return;
        }

        $this->permissions = (new RolesModel())->getPermissionsForIds($this->user->roles ?? []);
    }

    /**
     * Whether the current user has the given privilege. There is no
     * super-admin bypass — the `admin` role must be granted every privilege
     * it should have, same as any other role (see roles table seed data).
     */
    public function can(Permission $permission): bool
    {
        return in_array($permission->value, $this->permissions, true);
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
