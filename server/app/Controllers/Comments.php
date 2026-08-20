<?php

namespace App\Controllers;

use App\Enums\Permission;
use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Models\CommentsModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;
use Exception;

/**
 * Class Comments
 * @package App\Controllers
 *
 * @method ResponseInterface index()   List visible comments for an entity (public).
 * @method ResponseInterface random()  List N random visible comments of an entity type (public).
 * @method ResponseInterface create()  Post a new comment/review (auth required).
 * @method ResponseInterface delete($id) Soft-delete a comment (auth required; own or admin/moderator).
 */
class Comments extends BaseApiController
{
    private SessionLibrary $session;

    protected $model;

    public function __construct()
    {
        LocaleLibrary::init();

        $this->session = new SessionLibrary();
        $this->model   = new CommentsModel();
    }

    /**
     * GET /comments?entityType=event&entityId=:id&limit=20&offset=0
     * GET /comments?userId=:id
     *
     * Returns a slice of visible comments for the specified entity, newest first, with
     * author info, plus the real total count so clients can tell whether more remain
     * (the caller already knows what `limit`/`offset` it asked for, so the response
     * doesn't echo those back). Public endpoint — no authentication required.
     *
     * The `userId` form instead returns the caller's own review history (profile page).
     * It only ever honours the caller's own id — auth is required and a `userId` that
     * doesn't match the session user is rejected outright, since (unlike Events::list())
     * this branch has no unfiltered fallback to silently degrade to.
     *
     * @return ResponseInterface
     */
    public function index(): ResponseInterface
    {
        $userId = $this->request->getGet('userId', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        if (!empty($userId)) {
            if (!$this->session->isAuth) {
                return $this->respondUnauthorized(lang('App.accessDenied'));
            }

            if ($userId !== $this->session->user->id) {
                return $this->respondForbidden(lang('App.accessDenied'));
            }

            try {
                $items = $this->model->getByUser($userId, $this->request->getLocale());

                return $this->respond([
                    'total' => count($items),
                    'items' => $items,
                ]);
            } catch (Exception $e) {
                log_message('error', '{exception}', ['exception' => $e]);

                return $this->respondServerError(lang('General.serverError'));
            }
        }

        $entityType = $this->request->getGet('entityType', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $entityId   = $this->request->getGet('entityId', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $limit      = $this->request->getGet('limit', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100]]);
        $offset     = $this->request->getGet('offset', FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);

        if (empty($entityType) || empty($entityId)) {
            return $this->respondInvalidRequest('index() called without entityType/entityId query params');
        }

        if (!in_array($entityType, ['event', 'photo'], true)) {
            return $this->respondInvalidRequest("index() called with an unsupported entityType ($entityType)");
        }

        $limit  = $limit ?: 20;
        $offset = $offset ?: 0;

        try {
            $items = $this->model->getForEntity($entityType, $entityId, $limit, $offset);
            $total = $this->model->countForEntity($entityType, $entityId);

            $response = [
                'total' => $total,
                'items' => $items,
            ];

            if ($this->session->isAuth && $entityType === 'event') {
                $sessionUserId = $this->session->user->id;

                $response['canReview']   = $this->model->canReviewEvent($sessionUserId, $entityId);
                $response['hasReviewed'] = $this->model->hasReviewed($sessionUserId, 'event', $entityId);
            }

            return $this->respond($response);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
        }
    }

    /**
     * GET /comments/random?entityType=event&limit=5
     *
     * Returns N random visible comments for a given entity type (used for widgets).
     * Public endpoint — no authentication required.
     *
     * @return ResponseInterface
     */
    public function random(): ResponseInterface
    {
        $entityType = $this->request->getGet('entityType', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $limit      = $this->request->getGet('limit', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 50]]);

        if (empty($entityType)) {
            return $this->respondInvalidRequest('random() called without the entityType query param');
        }

        if (!in_array($entityType, ['event', 'photo'], true)) {
            return $this->respondInvalidRequest("random() called with an unsupported entityType ($entityType)");
        }

        $limit = $limit ?: 5;

        try {
            $items = $this->model->getRandom($entityType, $limit);

            return $this->respond(['items' => $items]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
        }
    }

    /**
     * POST /comments
     *
     * Create a new comment or review. Requires authentication.
     * For events: also validates the user is eligible to review (attended the event)
     * and has not already left a review.
     *
     * Body: { entityType, entityId, content, rating? }
     *
     * @return ResponseInterface
     */
    public function create(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        $input = $this->request->getJSON(true);

        $rules = [
            'entityType' => 'required|in_list[event,photo]',
            'entityId'   => 'required|string|max_length[15]',
            'content'    => 'required|min_length[10]|max_length[1000]',
        ];

        if (isset($input['entityType']) && $input['entityType'] === 'event') {
            $rules['rating'] = 'required|integer|greater_than[0]|less_than[6]';
        }

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->respondValidationErrors($this->validator->getErrors());
        }

        $entityType = $input['entityType'];
        $entityId   = $input['entityId'];
        $userId     = $this->session->user->id;

        try {
            if ($entityType === 'event') {
                if (!$this->model->canReviewEvent($userId, $entityId)) {
                    return $this->respondForbidden(lang('Comments.commentNotEligible'));
                }
            }

            if ($this->model->hasReviewed($userId, $entityType, $entityId)) {
                return $this->respondConflict(lang('Comments.commentAlreadyExists'));
            }

            $data = [
                'id'          => uniqid(),
                'user_id'     => $userId,
                'entity_type' => $entityType,
                'entity_id'   => $entityId,
                'content'     => $input['content'],
                'rating'      => isset($input['rating']) ? (int) $input['rating'] : null,
                'status'      => 'visible',
            ];

            $this->model->insert($data);

            return $this->respondCreated(['message' => lang('Comments.commentCreated')]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
        }
    }

    /**
     * DELETE /comments/:id
     *
     * Soft-delete a comment. Requires authentication.
     * Users can delete their own comments; admins and moderators can delete any comment.
     *
     * @param string|null $id Comment ID
     * @return ResponseInterface
     */
    public function delete($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        try {
            $comment = $this->model->find($id);

            if (!$comment) {
                return $this->respondNotFound(lang('Comments.commentNotFound'));
            }

            $userId       = $this->session->user->id;
            $isOwner      = $comment['user_id'] === $userId;
            $isPrivileged = $this->session->can(Permission::COMMENTS_MODERATE);

            if (!$isOwner && !$isPrivileged) {
                return $this->respondForbidden(lang('App.accessDenied'));
            }

            $this->model->delete($id);

            return $this->respondDeleted(['message' => lang('Comments.commentDeleted')]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->respondServerError(lang('General.serverError'));
        }
    }
}
