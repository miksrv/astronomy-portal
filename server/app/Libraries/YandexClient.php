<?php namespace App\Libraries;

/**
 * @link https://oauth.yandex.ru/
 */
class YandexClient {
    private string $clientId;

    private string $redirectUri;

    private string $secret;
    private string $token;

    private \CodeIgniter\HTTP\CURLRequest $client;

    public function __construct() {
        $this->client = \Config\Services::curlrequest();
    }

    public function setClientId(string $clientId): void {
        $this->clientId = $clientId;
    }

    public function setClientSecret(string $secret): void {
        $this->secret = $secret;
    }

    public function setRedirectUri(string $redirectUri): void {
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
    public function fetchAccessTokenWithAuthCode($authCode): string {
        $response = $this->client->setBody(http_build_query([
            'grant_type'    => 'authorization_code',
            'code'          => $authCode,
            'client_id'     => $this->clientId,
            'client_secret' => $this->secret
        ]))->post('https://oauth.yandex.ru/token');

        if ($response->getStatusCode() !== 200) {
            return '';
        }

        $response = json_decode($response->getBody());

        return $this->token = $response->access_token;
    }

    /**
     * STEP 3: Get user info
     * @return object|null
     */
    public function fetchUserInfo():? object {
        $response = $this->client
            ->setHeader('Authorization', 'OAuth ' . $this->token)
            ->request(
                'POST',
                'https://login.yandex.ru/info'
            );

        if ($response->getStatusCode() !== 200) {
            return null;
        }

        return json_decode($response->getBody());
    }
}
