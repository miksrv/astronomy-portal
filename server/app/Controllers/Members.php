<?php

namespace App\Controllers;

use App\Enums\Permission;
use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Models\RolesModel;
use App\Models\UsersModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use Config\Services;
use Exception;

/**
 * Class Members
 * @package App\Controllers
 *
 * Manages the admin members (users) list. list() and updateRoles() require
 * the users.manage privilege; events() also allows a user to fetch their own
 * event history.
 */
class Members extends ResourceController
{
    private SessionLibrary $session;

    public function __construct()
    {
        LocaleLibrary::init();

        $this->session = new SessionLibrary();
    }

    /**
     * GET /members
     * Paginated, filterable list of all users (ADMIN only). Filterable by
     * name (`search`) and by role (`roleIds`, comma-separated role ids —
     * OR semantics, since a user can hold several roles at once).
     * Email and phone are never returned.
     */
    public function list(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::USERS_MANAGE)) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        try {
            $page  = (int) $this->request->getGet('page', FILTER_VALIDATE_INT);
            $limit = (int) $this->request->getGet('limit', FILTER_VALIDATE_INT);

            $page  = $page >= 1 ? $page : 1;
            $limit = ($limit >= 1 && $limit <= 100) ? $limit : 20;

            $search       = (string) $this->request->getGet('search', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '';
            $roleIdsParam = (string) $this->request->getGet('roleIds', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '';

            $sortBy  = (string) $this->request->getGet('sortBy', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '';
            $sortDir = (string) $this->request->getGet('sortDir', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '';

            $validSortBy  = ['', 'name', 'activityAt', 'createdAt', 'eventsCount'];
            $validSortDir = ['', 'asc', 'desc'];

            $roleIds = $this->_parseRoleIds($roleIdsParam);

            if ($roleIds === null) {
                return $this->failValidationErrors(lang('General.invalidDataFormat'));
            }

            if (!in_array($sortBy, $validSortBy, true)) {
                $sortBy = 'createdAt';
            }

            if (!in_array($sortDir, $validSortDir, true)) {
                $sortDir = 'desc';
            }

            $usersModel = new UsersModel();
            $result     = $usersModel->getUsersList($page, $limit, $search, $roleIds, $sortBy, $sortDir);

            return $this->respond($result);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * GET /members/:id/events
     * List of events a user has registered for (non-cancelled). Available to
     * an ADMIN for any user, or to a regular user for their own history.
     */
    public function events(string $id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        $canManageUsers = $this->session->can(Permission::USERS_MANAGE);

        if (!$canManageUsers && $this->session->user->id !== $id) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        if (empty($id)) {
            return $this->failValidationErrors(lang('Members.notFound'));
        }

        try {
            $usersModel = new UsersModel();
            $user       = $usersModel->find($id);

            if (!$user) {
                return $this->failNotFound(lang('Members.notFound'));
            }

            $locale = $this->session->user->locale ?? 'ru';
            $result = $usersModel->getUserEvents($id, $locale);

            return $this->respond(['items' => $result]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * PATCH /members/:id/roles
     * Replaces a user's full set of assigned roles. Body: { roleIds: number[] }.
     */
    public function updateRoles(string $id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::USERS_MANAGE)) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        if (empty($id)) {
            return $this->failValidationErrors(lang('Members.notFound'));
        }

        $input = $this->request->getJSON(true);

        // 'permit_empty' (not 'required') because an empty array is a valid,
        // meaningful value here — it means "strip every elevated role from
        // this user, make them a plain account" (see UsersModel::updateRoles()).
        // CI4's 'required' rule fails on [] since it isn't `!== []`, which
        // would make that impossible.
        $rules = [
            'roleIds' => 'permit_empty',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input) || !array_key_exists('roleIds', $input) || !is_array($input['roleIds'])) {
            return $this->failValidationErrors(lang('General.invalidDataFormat'));
        }

        $roleIds = array_values(array_unique(array_map('intval', $input['roleIds'])));

        try {
            $usersModel = new UsersModel();
            $user       = $usersModel->find($id);

            if (!$user) {
                return $this->failNotFound(lang('Members.notFound'));
            }

            $rolesModel = new RolesModel();

            if (!$rolesModel->idsExist($roleIds)) {
                return $this->failValidationErrors(['error' => lang('Members.invalidRoleIds')]);
            }

            if (
                in_array(RolesModel::DEVELOPER_ROLE_ID, $roleIds, true)
                && $usersModel->isRoleAssignedToOtherUser(RolesModel::DEVELOPER_ROLE_ID, $id)
            ) {
                return $this->failValidationErrors(['error' => lang('Members.developerRoleAlreadyAssigned')]);
            }

            $usersModel->updateRoles($id, $roleIds);

            return $this->respondUpdated(['id' => $id, 'roleIds' => $roleIds]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * Parses the `roleIds` query filter (comma-separated role ids, e.g.
     * "1,3") used by GET /members to narrow the list to users holding any of
     * the given roles. Returns an empty array for "no filter" (param absent
     * or empty string), or null if the value isn't a valid comma-separated
     * list of integers — the caller should treat that as a validation error.
     *
     * @return array<int>|null
     */
    private function _parseRoleIds(string $roleIdsParam): ?array
    {
        if ($roleIdsParam === '') {
            return [];
        }

        $roleIds = [];

        foreach (explode(',', $roleIdsParam) as $part) {
            if (!ctype_digit($part)) {
                return null;
            }

            $roleIds[] = (int) $part;
        }

        return array_values(array_unique($roleIds));
    }
}
