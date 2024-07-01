<?php namespace App\Libraries;

use Config\Services;

const VK_API_VERSION = '5.199';

/**
 * @link https://id.vk.com/about/business/go/accounts/
 * @link https://id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/connection/api-integration/api-description#Poluchenie-cherez-kod-podtverzhdeniya
 *
 * Return format:
 * [
 *      *int id
 *      *string name
 *      *string email
 *      *int sex (male / female)
 *      *string avatar (url link for avatar)
 *      *string birthday (d.m.Y)
 * ]
 */
class VkClient {
    private string $clientId;

    private string $redirectUri;

    private string $secret;
    private string $access_token;

    private string $theme;

    private string $secretState = 'VkontakteAPIClientAuth';
    private string $codeVerifier;

    private \CodeIgniter\HTTP\CURLRequest $client;

    /**
     * @param string $clientId
     * @param string $secret
     * @param string $redirectUri
     * @param string $theme
     */
    public function __construct(string $clientId, string $secret, string $redirectUri, string $theme = 'light') {
        $this->client      = \Config\Services::curlrequest();
        $this->clientId    = $clientId;
        $this->secret      = $secret;
        $this->redirectUri = $redirectUri;
        $this->theme       = $theme === 'light' ? 'light' : 'dark';

        $this->codeVerifier = rtrim(strtr(base64_encode('mySecretCode'), "+/", "-_"), "=");
    }


    /**
     * STEP 1: Create auth link
     * @return string
     */
    public function createAuthUrl(): string {
        $request = Services::request();
        $params  = [
            'response_type'  => 'code',
            'client_id'      => $this->clientId,
            'redirect_uri'   => $this->redirectUri,
            'code_challenge' => rtrim(strtr(base64_encode(hash("sha256", $this->codeVerifier, true)), "+/", "-_"), "="),

            'state'   => $this->secretState,
            'scope'   => 'email',
            'scheme'  => $this->theme,
            'lang_id' => $request->getLocale() === 'ru' ? 0 : 3,

            'code_challenge_method' => 's256',
        ];

        return 'https://id.vk.com/authorize?' . urldecode(http_build_query($params));
    }

    /**
     * STEP 2: Change auth code to auth token
     * @param $code
     * @param $state
     * @param $device
     * @return object|null
     */
    public function authUser($code, $state, $device): ?object {
        if (!$code || !$device || $state !== $this->secretState) {
            return null;
        }

        $request = Services::request();
        $params  = [
            'grant_type'    => 'authorization_code',
            'code_verifier' => $this->codeVerifier,
            'redirect_uri'  => $this->redirectUri,
            'code'          => $code,
            'service_token' => $this->secret,
            'client_id'     => $this->clientId,
            'device_id'     => $device,
            'state'         => $state,
            'ip'            => $request->getIPAddress(),
        ];

        try {
            $response = $this->client
                ->setBody(http_build_query($params))
                ->post('https://id.vk.com/oauth2/auth');

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            $response = json_decode($response->getBody());

            $this->access_token = $response->access_token;

            return $this->_fetchUserInfo();
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return null;
        }
    }

    /**
     * STEP 3: Get user info
     * @return object|null
     */
    private function _fetchUserInfo(): ?object {
        if (!$this->access_token) {
            return null;
        }

        // TODO: https://dev.vk.com/ru/method/users.get

        $params  = [
            'access_token' => $this->access_token,
            'client_id'    => $this->clientId
        ];

        try {
            $userData = (object)[];
            $response = $this->client
                ->setBody(http_build_query($params))
                ->post('https://id.vk.com/oauth2/user_info');

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            $data    = json_decode($response->getBody())->user;
            $profile = $this->_fetchUserProfile($data->user_id);

            $userData->id    = $data->user_id ?? null;
            $userData->name  = $data->first_name . ' ' . $data->last_name;
            $userData->email = $data->email ?? null;
            $userData->sex   = !empty($data->sex)
                ? ($data->sex === 2 ? 'male' : 'female')
                : null;

            if (!empty($profile)) {
                $userData->avatar = $profile->photo_400_orig;
                $userData->name   = $profile->first_name . ' ' . $profile->last_name;
            }

            $userData->birthday = $data->birthday;

            return $userData;
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return null;
        }
    }

    /**
     * STEP 3 ADDITIONAL: (if you want to get big size user avatar)
     * Obtaining information about the user's profile, the most important thing is that a large avatar is returned here
     * @param int $userId
     * @return object|null
     */
    private function _fetchUserProfile(int $userId): ?object {
        if (!$this->access_token) {
            return null;
        }

        $params  = [
            'user_ids'     => $userId,
            'fields'       => 'photo_400_orig',
            'v'            => VK_API_VERSION,
            'access_token' => $this->access_token,
        ];

        try {
            $response = $this->client
                ->setBody(http_build_query($params))
                ->post('https://api.vk.com/method/users.get');

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            $result = json_decode($response->getBody());

            return $result->response[0];
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return null;
        }
    }
}