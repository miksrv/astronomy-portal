<?php

namespace App\Controllers;

use App\Entities\UserEntity;
use App\Libraries\EmailLibrary;
use App\Libraries\GoogleClient;
use App\Libraries\SessionLibrary;
use App\Libraries\YandexClient;
use App\Libraries\VkClient;
use App\Models\MagicLinkTokensModel;
use App\Models\RolesModel;
use App\Models\UsersModel;
use CodeIgniter\I18n\Time;
use CodeIgniter\Files\File;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;
use Exception;
use ReflectionException;

define('AUTH_TYPE_NATIVE', 'native');
define('AUTH_TYPE_GOOGLE', 'google');
define('AUTH_TYPE_YANDEX', 'yandex');
define('AUTH_TYPE_VK', 'vk');
define('AUTH_TYPE_EMAIL', 'email');

/**
 * Class Auth
 * Handles user authentication via various services (Google, Yandex, VK).
 *
 * @package App\Controllers
 *
 * @method ResponseInterface me() Updates the session and returns the authentication response.
 * @method ResponseInterface google() Authenticates the user via Google.
 * @method ResponseInterface yandex() Authenticates the user via Yandex.
 * @method ResponseInterface vk() Authenticates the user via VK.
 * @method bool validateRequest($input, array $rules, array $messages = []) Validates the request input.
 * @method mixed getRequestInput(IncomingRequest $request) Retrieves the input from the request.
 * @method ResponseInterface _serviceAuth(string $authType, object | null $serviceProfile) Handles the service authentication.
 * @method ResponseInterface responseAuth() Returns the authentication response.
 */
class Auth extends BaseApiController
{
    private SessionLibrary $session;

    public function __construct()
    {
        $this->session = new SessionLibrary();
    }

    /**
     * @throws Exception
     */
    public function me(): ResponseInterface
    {
        return $this->responseAuth();
    }

    /**
     * Revokes every token currently issued to the authenticated user (on any
     * device) by clearing their session id. Deliberately does not shorten or
     * otherwise touch the JWT's own lifetime (`auth.token.live`) — this is a
     * server-side kill switch layered on top of it, not a replacement for it.
     */
    public function logout(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        (new UsersModel())->update($this->session->user->id, ['session_token' => null]);

        return $this->respond(['success' => true]);
    }

    /**
     * Auth via Google
     * @link https://console.developers.google.com/
     * @throws ReflectionException
     */
    public function google(): ResponseInterface
    {
        if ($this->session->isAuth) {
            return $this->respondConflict(lang('Auth.alreadyAuthorized'));
        }

        $serviceClient = new GoogleClient(
            getenv('auth.google.clientID'),
            getenv('auth.google.secret'),
            getenv('auth.google.redirect')
        );

        $code = $this->request->getGet('code', FILTER_SANITIZE_SPECIAL_CHARS);

        // If there is no authorization code, then the user has not yet logged in to Yandex.
        if (!$code) {
            return $this->respond([
                'auth'     => false,
                'redirect' => $serviceClient->createAuthUrl(),
            ]);
        }

        return $this->_serviceAuth(
            AUTH_TYPE_GOOGLE,
            $serviceClient->authUser($code)
        );
    }

    /**
     * Auth via Yandex
     * @link https://oauth.yandex.ru/
     * @return ResponseInterface
     * @throws ReflectionException
     */
    public function yandex(): ResponseInterface
    {
        if ($this->session->isAuth) {
            return $this->respondConflict(lang('Auth.alreadyAuthorized'));
        }

        $serviceClient = new YandexClient(
            getenv('auth.yandex.clientID'),
            getenv('auth.yandex.secret'),
            getenv('auth.yandex.redirect')
        );

        $code = $this->request->getGet('code', FILTER_SANITIZE_SPECIAL_CHARS);

        // If there is no authorization code, then the user has not yet logged in to Yandex.
        if (!$code) {
            return $this->respond([
                'auth'     => false,
                'redirect' => $serviceClient->createAuthUrl(),
            ]);
        }

        return $this->_serviceAuth(
            AUTH_TYPE_YANDEX,
            $serviceClient->authUser($code)
        );
    }

    /**
     * Auth via VK
     * @link https://console.developers.google.com/
     * @throws ReflectionException
     */
    public function vk(): ResponseInterface
    {
        if ($this->session->isAuth) {
            return $this->respondConflict(lang('Auth.alreadyAuthorized'));
        }

        $serviceClient = new VkClient(
            getenv('auth.vk.clientID'),
            getenv('auth.vk.secret'),
            getenv('auth.vk.redirect'),
        );

        $code   = $this->request->getGet('code', FILTER_SANITIZE_SPECIAL_CHARS);
        $state  = $this->request->getGet('state', FILTER_SANITIZE_SPECIAL_CHARS);
        $device = $this->request->getGet('device_id', FILTER_SANITIZE_SPECIAL_CHARS);

        log_message('info', '[Auth:VK] Incoming callback params: code={code}, state={state}, device_id={device}', [
            'code'   => !empty($code) ? mb_substr($code, 0, 16) . '...' : 'EMPTY',
            'state'  => $state ?? 'EMPTY',
            'device' => $device ?? 'EMPTY',
        ]);

        // If there is no authorization code, then the user has not yet logged in to VK.
        if (!$code) {
            return $this->respond([
                'auth'     => false,
                'redirect' => $serviceClient->createAuthUrl(),
            ]);
        }

        return $this->_serviceAuth(
            AUTH_TYPE_VK,
            $serviceClient->authUser($code, $state, $device)
        );
    }

    /**
     * Requests a passwordless login link by email. Always responds with the
     * same generic success shape regardless of whether the email is
     * registered, malformed-but-valid, or currently rate-limited — this
     * endpoint must never reveal account existence.
     */
    public function requestMagicLink(): ResponseInterface
    {
        if ($this->session->isAuth) {
            return $this->respondConflict(lang('Auth.alreadyAuthorized'));
        }

        $input = $this->request->getJSON(true);

        $rules = [
            'email' => 'required|valid_email|max_length[255]',
        ];

        if (!$this->validateRequest($input, $rules)) {
            return $this->respondValidationErrors($this->validator->getErrors());
        }

        $email      = strtolower(trim($input['email']));
        $returnPath = $this->sanitizeReturnPath($input['returnPath'] ?? null);
        $ip         = $this->request->getIPAddress();

        $tokenModel = new MagicLinkTokensModel();

        if (!$tokenModel->isRateLimited($email, $ip)) {
            $rawToken = $tokenModel->createToken($email, $returnPath, $ip);

            $siteUrl = rtrim(getenv('app.siteUrl'), '/');
            $link    = $siteUrl . '/auth?token=' . $rawToken . ($returnPath !== null ? '&return=' . rawurlencode($returnPath) : '');

            try {
                $locale  = $this->request->getLocale();
                $subject = lang('Auth.magicLinkEmailSubject', [], $locale);
                $body    = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#1b1f27;">'
                    . '<h2 style="margin:0 0 12px;">' . esc(lang('Auth.magicLinkEmailTitle', [], $locale)) . '</h2>'
                    . '<p style="margin:0 0 16px;line-height:1.5;">' . esc(lang('Auth.magicLinkEmailIntro', [], $locale)) . '</p>'
                    . '<p style="margin:0 0 16px;"><a href="' . esc($link) . '" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">'
                    . esc(lang('Auth.magicLinkEmailButton', [], $locale)) . '</a></p>'
                    . '<p style="margin:0 0 12px;color:#656d76;font-size:13px;line-height:1.5;">' . esc(lang('Auth.magicLinkEmailExpiry', [], $locale)) . '</p>'
                    . '<p style="margin:0;color:#656d76;font-size:13px;line-height:1.5;">' . esc(lang('Auth.magicLinkEmailFooter', [], $locale)) . '</p>'
                    . '</div>';

                (new EmailLibrary())->send($email, $subject, $body);
            } catch (Exception $e) {
                EmailLibrary::logError('[Auth] Failed to send magic link email: ' . $e->getMessage());
            }
        }

        return $this->respond(['sent' => true]);
    }

    /**
     * Verifies a magic-link token and logs the user in, creating the account
     * on first use. Deliberately does not enforce the OAuth auth_type
     * mismatch check from `_serviceAuth()` — proving mailbox ownership is
     * treated as strictly stronger than any OAuth provider's email claim.
     */
    public function verifyMagicLink(): ResponseInterface
    {
        if ($this->session->isAuth) {
            return $this->respondConflict(lang('Auth.alreadyAuthorized'));
        }

        $input = $this->request->getJSON(true);
        $token = $input['token'] ?? null;

        if (empty($token)) {
            return $this->respondUnauthorized(lang('Auth.magicLinkInvalidOrExpired'));
        }

        $claim = (new MagicLinkTokensModel())->consumeToken($token);

        if (!$claim) {
            return $this->respondUnauthorized(lang('Auth.magicLinkInvalidOrExpired'));
        }

        [$userData, $isNewUser] = (new UsersModel())->findOrCreateByEmail($claim['email'], AUTH_TYPE_EMAIL);

        $this->session->authorization($userData);
        $this->ensureSessionToken($userData);

        log_message('info', '[Auth] Successfully authorized user {id} via email link (new={isNew})', [
            'id'     => $userData->id,
            'isNew'  => $isNewUser ? 'yes' : 'no',
        ]);

        return $this->responseAuth($isNewUser);
    }

    /**
     * Keeps only a same-origin relative path (no scheme/host), to prevent an
     * attacker-supplied returnPath from being embedded in the emailed link
     * and used as an open redirect.
     */
    private function sanitizeReturnPath(?string $returnPath): ?string
    {
        if (empty($returnPath) || !str_starts_with($returnPath, '/') || str_contains($returnPath, '://')) {
            return null;
        }

        return $returnPath;
    }

    /**
     * @param $input
     * @param array $rules
     * @param array $messages
     * @return bool
     */
    public function validateRequest($input, array $rules, array $messages =[]): bool
    {
        $this->validator = Services::Validation()->setRules($rules);

        return $this->validator->setRules($rules, $messages)->run($input);
    }

    /**
     * @param IncomingRequest $request
     * @return array|bool|float|int|mixed|object|string|null
     */
    public function getRequestInput(IncomingRequest $request): mixed
    {
        $input = $request->getPost();

        if (empty($input)) {
            //convert request body to associative array
            $input = json_decode($request->getBody(), true);
        }

        return $input;
    }

    /**
     * Authorization through the service (Yandex, Google or VK)
     * @param string $authType
     * @param object|null $serviceProfile
     * @return ResponseInterface
     * @throws ReflectionException
     */
    protected function _serviceAuth(string $authType, object | null $serviceProfile): ResponseInterface
    {
        if (empty($serviceProfile)) {
            // Reachable through a normal login attempt - not just a bug/direct
            // API call - e.g. the OAuth code was already used or expired (page
            // refresh, browser back button after login) or the provider had a
            // transient error. Worth a real log line, but the user gets a
            // plain-language retry prompt, not the internal "empty profile".
            log_message('warning', '[Auth] Service {type} returned empty profile (null)', ['type' => $authType]);
            return $this->respondError(lang('Auth.oauthLoginFailed'));
        }

        if (empty($serviceProfile->email)) {
            log_message('warning', '[Auth] Service {type} profile has no email address', ['type' => $authType]);
            return $this->respondError(lang('Auth.oauthEmailMissing'));
        }

        // Successful authorization, look for a user with the same email in the database
        $userModel = new UsersModel();
        $userData  = $userModel->findUserByEmailAddress($serviceProfile->email);

        // If there is no user with this email, then register a new user
        if (empty($userData)) {
            $createUser = new UserEntity();
            $createUser->name      = $serviceProfile->name;
            $createUser->email     = $serviceProfile->email;
            $createUser->auth_type = $authType;
            $createUser->locale    = !empty($serviceProfile->locale) ? $serviceProfile->locale : $locale = $this->request->getLocale();

            if (!empty($serviceProfile->sex)) {
                $createUser->sex = $serviceProfile->sex === 'male' || $serviceProfile->sex === 1 ? 'm' : 'f';
            }

            if (!empty($serviceProfile->birthday)) {
                $birthdayTime = new Time($serviceProfile->birthday);
                $createUser->birthday = $birthdayTime->format('Y-m-d');
            }

            if (!empty($serviceProfile->id)) {
                $createUser->service_id = $serviceProfile->id;
            }

            $userModel->insert($createUser);

            $newUserId = $userModel->getInsertID();

            // If a Google user has an avatar, copy it
            $avatarUrl = $serviceProfile->avatar ?? '';
            $allowedHosts = [
                'lh3.googleusercontent.com',
                'lh4.googleusercontent.com',
                'lh5.googleusercontent.com',
                'lh6.googleusercontent.com',
                'sun1.userapi.com', 'sun2.userapi.com', 'sun3.userapi.com',
                'avatars.mds.yandex.net',
            ];
            $parsedUrl = parse_url($avatarUrl);

            if (!empty($avatarUrl) && isset($parsedUrl['host']) && in_array($parsedUrl['host'], $allowedHosts, true) && ($parsedUrl['scheme'] ?? '') === 'https') {
                $avatarDirectory = UPLOAD_USERS . '/' . $newUserId . '/';
                $avatar = $newUserId . '.jpg';

                if (!is_dir($avatarDirectory)) {
                    mkdir($avatarDirectory, 0777, true);
                }

                $avatarContent = @file_get_contents($avatarUrl);
                if ($avatarContent !== false && getimagesizefromstring($avatarContent) !== false) {
                    file_put_contents($avatarDirectory . $avatar, $avatarContent);

                    $file = new File($avatarDirectory . $avatar);
                    $name = pathinfo($file, PATHINFO_FILENAME);
                    $ext  = $file->getExtension();

                    $image = Services::image('gd'); // imagick
                    $image->withFile($file->getRealPath())
                        ->fit(AVATAR_WIDTH, AVATAR_HEIGHT)
                        ->save($avatarDirectory . $name . '_medium.' . $ext);

                    $userModel->update($newUserId, ['avatar' => $avatar]);
                }
            }

            $userData     = $createUser;
            $userData->id = $newUserId;
        }

        // A verified email address is treated as equally strong proof of identity
        // regardless of which service confirmed it, so signing in via a different
        // service than last time is allowed — it just becomes the new auth_type
        // (see the equivalent reasoning for magic-link auth further up this file).
        if ($userData->auth_type !== null && $userData->auth_type !== $authType) {
            log_message('info', '[Auth] User {id} switched auth method from {old} to {new}', [
                'id'  => $userData->id ?? 'N/A',
                'old' => $userData->auth_type,
                'new' => $authType,
            ]);
        }

        if (empty($userData->service_id) && !empty($serviceProfile->id)) {
            log_message('info', '[Auth] Updating service_id for user {id} via {type}', [
                'id'   => $userData->id,
                'type' => $authType,
            ]);
            $updateData = ['service_id' => $serviceProfile->id];

            if (!empty($serviceProfile->sex)) {
                $updateData['sex'] = $serviceProfile->sex === 'male' || $serviceProfile->sex === 1 ? 'm' : 'f';
            }

            if (!empty($serviceProfile->birthday)) {
                $birthdayTime = new Time($serviceProfile->birthday);
                $updateData['birthday'] = $birthdayTime->format('Y-m-d');
            }

            $userModel->update($userData->id, $updateData);
        }

        if ($userData->auth_type !== $authType) {
            $userModel->update($userData->id, ['auth_type' => $authType]);
        }

        $this->session->authorization($userData);
        $this->ensureSessionToken($userData);

        log_message('info', '[Auth] Successfully authorized user {id} via {type}', [
            'id'   => $userData->id,
            'type' => $authType,
        ]);

        return $this->responseAuth();
    }

    /**
     * @return ResponseInterface
     * @throws ReflectionException
     */
    public function updateProfile(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->respondUnauthorized(lang('App.accessDenied'));
        }

        $input = $this->request->getJSON(true);

        $rules = [
            'name'     => 'required|min_length[2]|max_length[100]',
            'phone'    => 'permit_empty|max_length[20]',
            'birthday' => 'permit_empty|valid_date[Y-m-d]',
            'sex'      => 'permit_empty|in_list[m,f]',
        ];

        if (!$this->validateRequest($input, $rules)) {
            return $this->respondValidationErrors($this->validator->getErrors());
        }

        $userModel = new UsersModel();

        $updateData = ['name' => $input['name']];

        if (array_key_exists('phone', $input)) {
            $updateData['phone'] = $input['phone'];
        }

        if (array_key_exists('birthday', $input)) {
            $updateData['birthday'] = $input['birthday'];
        }

        if (array_key_exists('sex', $input)) {
            $updateData['sex'] = $input['sex'];
        }

        $updated = $userModel->update($this->session->user->id, $updateData);

        if (!$updated) {
            return $this->respondServerError(lang('App.profileUpdateFailed'));
        }

        return $this->respondUpdated();
    }

    /**
     * Ensures the user has an active session id, generating one only if
     * there isn't one yet (first login since account creation, or since the
     * last explicit logout). Deliberately does not rotate an existing
     * session id on every login, so signing in on a new device doesn't
     * invalidate sessions already active on other devices — only an
     * explicit `logout()` call does that.
     *
     * @param UserEntity $user Mutated in place so the caller's in-memory
     *                         `$this->session->user` (same object reference)
     *                         reflects the token immediately, without a re-fetch.
     */
    private function ensureSessionToken(UserEntity $user): string
    {
        if (!empty($user->session_token)) {
            return $user->session_token;
        }

        $sessionToken = bin2hex(random_bytes(32));

        (new UsersModel())->update($user->id, ['session_token' => $sessionToken]);

        $user->session_token = $sessionToken;

        return $sessionToken;
    }

    /**
     * @param bool $isNewUser Set when the account was just created via the
     *                        magic-link flow; adds `isNewUser` to the response
     *                        so the frontend can route to profile onboarding.
     *                        Omitted (false) by every existing caller, so
     *                        their response shape is unchanged.
     * @return ResponseInterface
     */
    protected function responseAuth(bool $isNewUser = false): ResponseInterface
    {
        $response = (object) ['auth' => $this->session->isAuth];

        if ($this->session->isAuth && $this->session->user) {
            $response->user  = $this->session->user;
            $response->token = generateAuthToken($this->session->user->email, $this->session->user->session_token);

            unset($response->user->auth_type);
            unset($response->user->session_token);

            $roleIds = $this->session->user->roles ?? [];
            $roles   = empty($roleIds) ? [] : (new RolesModel())->whereIn('id', $roleIds)->findAll();

            unset($response->user->roles);
            $response->user->roles       = array_map(static fn ($role) => $role->name, $roles);
            $response->user->permissions = $this->session->permissions;

            if ($isNewUser) {
                $response->isNewUser = true;
            }
        }

        return $this->respond($response);
    }
}
