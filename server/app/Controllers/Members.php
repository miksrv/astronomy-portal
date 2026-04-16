<?php

namespace App\Controllers;

use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Models\UsersModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use Exception;

/**
 * Class Members
 * @package App\Controllers
 *
 * Manages the admin members (users) list. All endpoints require ADMIN role.
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
     * Paginated, filterable list of all users (ADMIN only).
     * Email and phone are never returned.
     */
    public function list(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        try {
            $page  = (int) $this->request->getGet('page', FILTER_VALIDATE_INT);
            $limit = (int) $this->request->getGet('limit', FILTER_VALIDATE_INT);

            $page  = $page >= 1 ? $page : 1;
            $limit = ($limit >= 1 && $limit <= 100) ? $limit : 20;

            $search   = (string) $this->request->getGet('search', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '';
            $role     = (string) $this->request->getGet('role', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '';
            $authType = (string) $this->request->getGet('authType', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '';

            $sortBy  = (string) $this->request->getGet('sortBy', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '';
            $sortDir = (string) $this->request->getGet('sortDir', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '';

            $validRoles     = ['', 'user', 'moderator', 'security', 'admin'];
            $validAuthTypes = ['', 'google', 'yandex', 'vk', 'native'];
            $validSortBy    = ['', 'name', 'activityAt', 'createdAt', 'eventsCount'];
            $validSortDir   = ['', 'asc', 'desc'];

            if (!in_array($role, $validRoles, true)) {
                return $this->failValidationErrors(lang('Members.invalidRole'));
            }

            if (!in_array($authType, $validAuthTypes, true)) {
                return $this->failValidationErrors(lang('Members.invalidAuthType'));
            }

            if (!in_array($sortBy, $validSortBy, true)) {
                $sortBy = 'createdAt';
            }

            if (!in_array($sortDir, $validSortDir, true)) {
                $sortDir = 'desc';
            }

            $usersModel = new UsersModel();
            $result     = $usersModel->getUsersList($page, $limit, $search, $role, $authType, $sortBy, $sortDir);

            return $this->respond($result);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * GET /members/:id/events
     * List of events a user has registered for (non-cancelled). ADMIN only.
     */
    public function events(string $id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
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
}
