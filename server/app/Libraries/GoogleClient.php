<?php namespace App\Libraries;

/**
 * @link https://console.developers.google.com/
 */
class GoogleClient {
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
     * @return string
     */
    public function fetchAccessTokenWithAuthCode($authCode): string {
        $response = $this->client->setBody(http_build_query([
            'grant_type'    => 'authorization_code',
            'code'          => $authCode,
            'client_id'     => $this->clientId,
            'client_secret' => $this->secret,
            'redirect_uri'  => $this->redirectUri,
        ]))->post('https://accounts.google.com/o/oauth2/token');

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
    public function fetchUserInfo(): ?object {
        $response = $this->client
            ->setHeader('Authorization', 'Bearer ' . $this->token)
            ->post('https://www.googleapis.com/oauth2/v3/userinfo');

        if ($response->getStatusCode() !== 200) {
            return null;
        }

        return json_decode($response->getBody());
    }
}
