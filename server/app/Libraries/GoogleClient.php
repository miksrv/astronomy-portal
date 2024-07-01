<?php namespace App\Libraries;

/**
 * @link https://console.developers.google.com/
 *
 * Return format:
 * [
 *      *string id
 *      *string name
 *      *string email
 *      *string locale
 *      *string avatar (url link for avatar)
 * ]
 */
class GoogleClient {
    private string $clientId;

    private string $redirectUri;

    private string $secret;
    private string $access_token;

    private \CodeIgniter\HTTP\CURLRequest $client;

    /**
     * @param string $clientId
     * @param string $secret
     * @param string $redirectUri
     */
    public function __construct(string $clientId, string $secret, string $redirectUri) {
        $this->client      = \Config\Services::curlrequest();
        $this->clientId    = $clientId;
        $this->secret      = $secret;
        $this->redirectUri = $redirectUri;
    }


    /**
     * STEP 1: Create auth link
     * @return string
     */
    public function createAuthUrl(): string {
        $params = [
            'client_id'     => $this->clientId,
            'redirect_uri'  => $this->redirectUri,
            'response_type' => 'code',
            'scope'         => 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
            'access_type'   => 'offline',
            'prompt'        => 'consent'
        ];

        return 'https://accounts.google.com/o/oauth2/auth?' . urldecode(http_build_query($params));
    }

    /**
     * STEP 2: Change auth code to auth token
     * @param $authCode
     * @return object|null
     */
    public function authUser($authCode): ?object {
        $params  = [
            'grant_type'    => 'authorization_code',
            'code'          => $authCode,
            'client_id'     => $this->clientId,
            'client_secret' => $this->secret,
            'redirect_uri'  => $this->redirectUri,
        ];

        try {
            $response = $this->client
                ->setBody(http_build_query($params))
                ->post('https://accounts.google.com/o/oauth2/token');

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

        try {
            $userData = (object)[];
            $response = $this->client
                ->setHeader('Authorization', 'Bearer ' . $this->access_token)
                ->post('https://www.googleapis.com/oauth2/v3/userinfo');

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            $data = json_decode($response->getBody());

            $userData->id     = $data->sub ?? null;
            $userData->name   = $data->name ?? null;
            $userData->email  = $data->email ?? null;
            $userData->avatar = $data->picture ?? null;
            $userData->locale = $data->locale ?? 'ru';

            return $userData;
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return null;
        }
    }
}