<?php namespace App\Libraries;

/**
 * @link https://oauth.yandex.ru/
 *
 *  Return format:
 *  [
 *       *string id
 *       *string name
 *       *string email
 *       *string locale
 *       *string avatar (url link for avatar)
 *       *string sex (male \ female?)
 *  ]
 */
class YandexClient {
    private string $clientId;

    private string $redirectUri;

    private string $secret;
    private string $access_token;

    private \CodeIgniter\HTTP\CURLRequest $client;

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
            'response_type' => 'code'
        ];

        return 'https://oauth.yandex.ru/authorize?' . urldecode(http_build_query($params));
    }

    /**
     * STEP 2: Change auth code to auth token
     * @param $authCode
     * @return string
     */
    public function authUser($authCode): ?object {
        $params  = [
            'grant_type'    => 'authorization_code',
            'code'          => $authCode,
            'client_id'     => $this->clientId,
            'client_secret' => $this->secret
        ];

        try {
            $response = $this->client
                ->setBody(http_build_query($params))
                ->post('https://oauth.yandex.ru/token');

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
                ->setHeader('Authorization', 'OAuth ' . $this->access_token)
                ->request(
                    'POST',
                    'https://login.yandex.ru/info'
                );

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            $data = json_decode($response->getBody());

            $userData->id     = $data->id ?? null;
            $userData->name   = $data->real_name ?? null;
            $userData->email  = !empty($data->default_email) ? strtolower($data->default_email) ?? null : null;
            $userData->sex    = $data->sex ?? null;
            $userData->avatar = !$data->is_avatar_empty && $data->default_avatar_id
                ? "https://avatars.yandex.net/get-yapic/{$data->default_avatar_id}/islands-200"
                : null;

            return $userData;
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return null;
        }
    }
}