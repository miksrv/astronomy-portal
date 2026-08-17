<?php

namespace App\Controllers;

use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Models\PushSubscriptionsModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use Config\Push;
use Config\Services;
use Exception;

/**
 * Class PushSubscriptions
 * @package App\Controllers
 *
 * User-facing Web Push opt-in/opt-out endpoints. Unlike PushNotifications
 * (the admin campaign controller), these don't gate on a Permission — but
 * unlike most of the rest of the app, subscribe() doesn't even require
 * isAuth: a guest may opt into push from the site-wide stargazing banner
 * before ever logging in (rate-limited instead, see Routes.php). unsubscribe()
 * still requires isAuth and only ever touches the caller's own rows.
 */
class PushSubscriptions extends ResourceController
{
    private SessionLibrary $session;
    protected $model;

    public function __construct()
    {
        LocaleLibrary::init();

        $this->session = new SessionLibrary();
        $this->model   = new PushSubscriptionsModel();
    }

    /**
     * GET /push/vapid-key
     * Public — returns the VAPID public key the browser needs to create a
     * PushSubscription via pushManager.subscribe().
     */
    public function vapidKey(): ResponseInterface
    {
        return $this->respond([
            'publicKey' => Push::vapidPublicKey(),
        ]);
    }

    /**
     * POST /push/subscribe
     * Registers (or refreshes) a push subscription for the current
     * browser/device. Body: { endpoint, keys: { p256dh, auth }, userAgent? }.
     *
     * Deliberately public (rate-limited, see Routes.php) — a guest visitor
     * may opt into push notifications from the site-wide stargazing banner
     * before ever logging in. The row is stored with user_id = null in that
     * case; if/when they later log in on the same browser, the frontend
     * re-POSTs the same subscription, and since the request is now
     * authenticated, upsertByEndpoint() claims the row for that user.
     */
    public function subscribe(): ResponseInterface
    {
        $input = $this->request->getJSON(true);

        $rules = [
            'endpoint'      => 'required|string|max_length[512]',
            'keys'          => 'required',
            'keys.p256dh'   => 'required|string|max_length[255]',
            'keys.auth'     => 'required|string|max_length[255]',
            'userAgent'     => 'if_exist|permit_empty|string|max_length[255]',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $subscription = $this->model->upsertByEndpoint(
                $this->session->isAuth ? $this->session->user->id : null,
                $input['endpoint'],
                $input['keys'],
                $input['userAgent'] ?? null
            );

            return $this->respond($subscription);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * DELETE /push/subscribe
     * Removes a push subscription. Body: { endpoint }. Only removes a row
     * that belongs to the requesting user — never lets one user unsubscribe
     * another user's endpoint.
     */
    public function unsubscribe(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        $input = $this->request->getJSON(true);

        $rules = [
            'endpoint' => 'required|string|max_length[512]',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $this->model->deleteByUserAndEndpoint($this->session->user->id, $input['endpoint']);

            return $this->respondDeleted(['endpoint' => $input['endpoint']]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }
}
