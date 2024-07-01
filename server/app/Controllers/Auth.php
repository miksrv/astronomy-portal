<?php namespace App\Controllers;

use App\Entities\User;
use App\Libraries\GoogleClient;
use App\Libraries\SessionLibrary;
use App\Libraries\YandexClient;
use App\Models\UsersModel;
use CodeIgniter\Files\File;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use Config\Services;
use Exception;
use ReflectionException;

define('AUTH_TYPE_NATIVE', 'native');
define('AUTH_TYPE_GOOGLE', 'google');
define('AUTH_TYPE_YANDEX', 'yandex');
define('AUTH_TYPE_VK', 'vk');

class Auth extends ResourceController {
    private SessionLibrary $session;

    public function __construct() {
        $this->session = new SessionLibrary();
    }


    /**
     * Authenticate Existing User
     * @return ResponseInterface
     * @throws ReflectionException
     */
    public function login(): ResponseInterface {
        if ($this->session->isAuth) {
            return $this->failForbidden('Already authorized');
        }

        $rules = [
            'email'    => 'required|min_length[6]|max_length[50]|valid_email',
            'password' => 'required|min_length[8]|max_length[255]|validateUser[email, password]'
        ];

        $errors = [
            'password' => [
                'validateUser' => 'Invalid login credentials provided'
            ]
        ];

        $input = $this->getRequestInput($this->request);

        if (!$this->validateRequest($input, $rules, $errors)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $userModel = new UsersModel();
        $userData  = $userModel->findUserByEmailAddress($input['email']);

        $this->session->authorization($userData);

        return $this->responseAuth();
    }


    /**
     * @throws Exception
     */
    public function me(): ResponseInterface {
        $this->session->update();
        return $this->responseAuth();
    }

    /**
     * Auth via Google
     * @link https://console.developers.google.com/
     * @throws ReflectionException
     */
    public function google(): ResponseInterface {
        if ($this->session->isAuth) {
            return $this->failForbidden(lang('Auth.alreadyAuthorized'));
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
    public function yandex(): ResponseInterface {
        if ($this->session->isAuth) {
            return $this->failForbidden('Вы уже авторизованы');
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
    public function vk(): ResponseInterface {
        if ($this->session->isAuth) {
            return $this->failForbidden(lang('Auth.alreadyAuthorized'));
        }

        $serviceClient = new VkClient(
            getenv('auth.vk.clientID'),
            getenv('auth.vk.secret'),
            getenv('auth.vk.redirect'),
        );

        $code   = $this->request->getGet('code', FILTER_SANITIZE_SPECIAL_CHARS);
        $state  = $this->request->getGet('state', FILTER_SANITIZE_SPECIAL_CHARS);
        $device = $this->request->getGet('device_id', FILTER_SANITIZE_SPECIAL_CHARS);

        // If there is no authorization code, then the user has not yet logged in to Yandex.
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
     * @param $input
     * @param array $rules
     * @param array $messages
     * @return bool
     */
    public function validateRequest($input, array $rules, array $messages =[]): bool {
        $this->validator = Services::Validation()->setRules($rules);

        return $this->validator->setRules($rules, $messages)->run($input);
    }

    /**
     * @param IncomingRequest $request
     * @return array|bool|float|int|mixed|object|string|null
     */
    public function getRequestInput(IncomingRequest $request): mixed {
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
        if (empty($serviceProfile) || empty($serviceProfile->email)) {
            return $this->failValidationErrors(lang('Auth.authServiceEmptyData'));
        }

        // Successful authorization, look for a user with the same email in the database
        $userModel = new UsersModel();
        $userData  = $userModel->findUserByEmailAddress($serviceProfile->email);

        // If there is no user with this email, then register a new user
        if (empty($userData)) {
            $createUser = new User();
            $createUser->name      = $serviceProfile->name;
            $createUser->email     = $serviceProfile->email;
            $createUser->auth_type = $authType;
            $createUser->locale    = !empty($serviceProfile->locale) ? $serviceProfile->locale : $locale = $this->request->getLocale();

            // TODO
            // $user->sex      = $serviceProfile->sex ?? null;
            // $user->birthday = $serviceProfile->birthday ?? null;

            $userModel->insert($createUser);

            $newUserId = $userModel->getInsertID();

            // If a Google user has an avatar, copy it
            if ($serviceProfile->avatar) {
                $avatarDirectory = UPLOAD_USERS . '/' . $newUserId . '/';
                $avatar = $newUserId . '.jpg';

                if (!is_dir($avatarDirectory)) {
                    mkdir($avatarDirectory,0777, TRUE);
                }

                file_put_contents($avatarDirectory . $avatar, file_get_contents($serviceProfile->avatar));

                $file = new File($avatarDirectory . $avatar);
                $name = pathinfo($file, PATHINFO_FILENAME);
                $ext  = $file->getExtension();

                $image = Services::image('gd'); // imagick
                $image->withFile($file->getRealPath())
                    ->fit(AVATAR_WIDTH, AVATAR_HEIGHT)
                    ->save($avatarDirectory  . $name . '_medium.' . $ext);

                $userModel->update($newUserId, ['avatar' => $avatar]);
            }

            $userData     = $createUser;
            $userData->id = $newUserId;
        }

        // All migrated users will not have an authorization type in the database, so it will be possible to
        // either recover the password or log in through Google or another system.
        // But if the authorization type is already specified, you should authorize only this way.
        if ($userData->auth_type !== null && $userData->auth_type !== $authType) {
            return $this->failValidationErrors(lang('Auth.authWrongService'));
        }

        if ($userData->auth_type !== $authType) {
            $userModel->update($userData->id, ['auth_type' => $authType]);
        }

        $this->session->authorization($userData);

        return $this->responseAuth();
    }

    /**
     * @return ResponseInterface
     */
    protected function responseAuth(): ResponseInterface {
        $response = (object) ['auth' => $this->session->isAuth];

        if ($this->session->isAuth && $this->session->user) {
            $response->user  = $this->session->user;
            $response->token = generateAuthToken($this->session->user->email);

            unset($response->user->email, $response->user->auth_type);
            
            if ($response->user->role === 'user') {
                unset($response->user->role);
            }
        }

        return $this->respond($response);
    }
}
