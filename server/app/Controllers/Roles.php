<?php

namespace App\Controllers;

use App\Enums\Permission;
use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Models\RolesModel;
use App\Models\UsersModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;
use Exception;

/**
 * Class Roles
 * @package App\Controllers
 *
 * Admin-only CRUD for roles (each role is a name + a set of privileges from
 * the fixed App\Enums\Permission catalog). Assigning roles to a specific
 * user happens through Members::updateRoles(), not here.
 *
 * Permission::USERS_MANAGE is hardcoded to RolesModel::DEVELOPER_ROLE_ID —
 * create()/update() reject granting it to any other role, and it can never
 * be stripped from the developer role itself. Without this, any role
 * holding USERS_MANAGE could grant itself (or anyone) arbitrary further
 * privileges via this very controller.
 */
class Roles extends BaseApiController
{
    private SessionLibrary $session;

    public function __construct()
    {
        LocaleLibrary::init();

        $this->session = new SessionLibrary();
    }

    /**
     * GET /roles
     */
    public function list(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::USERS_MANAGE)) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        try {
            $rolesModel       = new RolesModel();
            $roles            = $rolesModel->orderBy('id', 'ASC')->findAll();
            $usersCountByRole = $rolesModel->countUsersPerRole();

            $items = array_map(static fn ($role) => [
                'id'          => $role->id,
                'name'        => $role->name,
                'permissions' => $role->permissions,
                'usersCount'  => $usersCountByRole[(int) $role->id] ?? 0,
            ], $roles);

            return $this->respond(['items' => $items]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
        }
    }

    /**
     * GET /roles/permissions
     * Returns the full, fixed catalog of privileges a role can be granted —
     * used by the admin UI to render the checkbox list when creating/editing
     * a role.
     */
    public function permissions(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::USERS_MANAGE)) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        $items = array_map(static fn (Permission $permission) => $permission->value, Permission::cases());

        return $this->respond(['items' => $items]);
    }

    /**
     * GET /roles/:id
     */
    public function show($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::USERS_MANAGE)) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        $role = (new RolesModel())->find($id);

        if (!$role) {
            return $this->respondNotFound();
        }

        return $this->respond($role);
    }

    /**
     * POST /roles
     */
    public function create(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::USERS_MANAGE)) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        $input = $this->request->getJSON(true);

        $rules = [
            'name'        => 'required|string|min_length[2]|max_length[50]',
            'permissions' => 'if_exist',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->respondValidationErrors($this->validator->getErrors());
        }

        $permissions = $this->_sanitizePermissions($input['permissions'] ?? []);

        if ($permissions === null) {
            return $this->respondValidationErrors(['permissions' => lang('General.invalidDataFormat')]);
        }

        // USERS_MANAGE is hardcoded to the single reserved developer role
        // (RolesModel::DEVELOPER_ROLE_ID) — granting it to any newly created
        // role would let that role's holders manage roles/users themselves,
        // including granting USERS_MANAGE further, i.e. privilege escalation.
        if (in_array(Permission::USERS_MANAGE->value, $permissions, true)) {
            return $this->respondValidationErrors(['permissions' => lang('Roles.usersManageReserved')]);
        }

        try {
            $rolesModel = new RolesModel();
            $rolesModel->insert([
                'name'        => $input['name'],
                'permissions' => json_encode($permissions),
            ]);

            $created = $rolesModel->find($rolesModel->getInsertID());

            return $this->respondCreated($created);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
        }
    }

    /**
     * PATCH /roles/:id
     */
    public function update($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::USERS_MANAGE)) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        $rolesModel = new RolesModel();
        $role       = $rolesModel->find($id);

        if (!$role) {
            return $this->respondNotFound();
        }

        $input = $this->request->getJSON(true);

        $rules = [
            'name'        => 'if_exist|string|min_length[2]|max_length[50]',
            'permissions' => 'if_exist',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->respondValidationErrors($this->validator->getErrors());
        }

        $updateData = [];

        if (isset($input['name'])) {
            $updateData['name'] = $input['name'];
        }

        if (array_key_exists('permissions', $input)) {
            $permissions = $this->_sanitizePermissions($input['permissions'] ?? []);

            if ($permissions === null) {
                return $this->respondValidationErrors(['permissions' => lang('General.invalidDataFormat')]);
            }

            $isDeveloperRole = (int) $id === RolesModel::DEVELOPER_ROLE_ID;
            $hasUsersManage  = in_array(Permission::USERS_MANAGE->value, $permissions, true);

            // See create(): USERS_MANAGE may only ever live on the reserved
            // developer role — granting it elsewhere is privilege escalation,
            // and stripping it from the developer role would leave nobody
            // able to manage roles/users at all.
            if ($hasUsersManage && !$isDeveloperRole) {
                return $this->respondValidationErrors(['permissions' => lang('Roles.usersManageReserved')]);
            }

            if ($isDeveloperRole && !$hasUsersManage) {
                return $this->respondValidationErrors(['permissions' => lang('Roles.developerRoleRequiresUsersManage')]);
            }

            $updateData['permissions'] = json_encode($permissions);
        }

        try {
            if (!empty($updateData)) {
                $rolesModel->update($id, $updateData);
            }

            return $this->respondUpdated($rolesModel->find($id));
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
        }
    }

    /**
     * DELETE /roles/:id
     *
     * Before removing the role itself, strips its id from every user's
     * `roles` JSON array — there is no foreign key to cascade this (see
     * UsersModel::removeRoleFromAllUsers()), so it must happen here.
     */
    public function delete($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::USERS_MANAGE)) {
            return $this->respondForbidden(lang('App.accessDenied'));
        }

        $rolesModel = new RolesModel();
        $role       = $rolesModel->find($id);

        if (!$role) {
            return $this->respondNotFound();
        }

        if ((int) $id === RolesModel::DEVELOPER_ROLE_ID) {
            return $this->respondConflict(lang('Roles.cannotDeleteDeveloperRole'));
        }

        try {
            (new UsersModel())->removeRoleFromAllUsers((int) $id);
            $rolesModel->delete($id);

            return $this->respondDeleted($role);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
        }
    }

    /**
     * Validates that every value is a known Permission and returns the
     * plain string list to persist, or null if any value is not recognised.
     *
     * @param mixed $permissions
     * @return array<string>|null
     */
    private function _sanitizePermissions(mixed $permissions): ?array
    {
        if (!is_array($permissions)) {
            return null;
        }

        $validValues = array_map(static fn (Permission $permission) => $permission->value, Permission::cases());

        foreach ($permissions as $permission) {
            if (!in_array($permission, $validValues, true)) {
                return null;
            }
        }

        return array_values(array_unique($permissions));
    }
}
