<?php namespace App\Controllers;

use App\Libraries\SessionLibrary;
use App\Models\UsersModel;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use Config\Services;
use Exception;
use ReflectionException;

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

        $response = (object) ['auth' => $this->session->isAuth];

        if ($this->session->isAuth && $this->session->user) {
            $response->user  = $this->session->user;
            $response->token = generateAuthToken($this->session->user->email);
        }

        return $this->respond($response);
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
     * @return ResponseInterface
     */
    protected function responseAuth(): ResponseInterface {
        return $this->respond([
            'auth'  => $this->session->isAuth,
            'user'  => $this->session->user,
            'token' => generateAuthToken($this->session->user->email),
        ]);
    }
}
