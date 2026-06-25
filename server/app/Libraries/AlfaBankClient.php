<?php

namespace App\Libraries;

/**
 * Alfa-Bank internet acquiring (REST) client.
 *
 * Wraps the Alfa-Bank payment gateway REST API:
 *   - register.do                — register an order, returns { orderId, formUrl }
 *   - getOrderStatusExtended.do   — poll the authoritative order status
 *   - refund.do                   — refund a paid order
 * Asynchronous callbacks are authenticated with an HMAC-SHA256 checksum over the
 * alphabetically-sorted "key;value;" parameter string, using the symmetric
 * callback token configured in the Alfa-Bank merchant cabinet.
 *
 * @link https://ecom.alfabank.ru/assets/instructions/merchantManual/pages/index/rest.html
 *
 * Single-stage payments are used (register.do auto-deposits), so a successful
 * order reaches orderStatus = 2 ("deposited").
 */
class AlfaBankClient implements PaymentGatewayInterface
{
    private string $userName;
    private string $password;
    private string $gatewayUrl;
    private string $callbackToken;

    private \CodeIgniter\HTTP\CURLRequest $client;

    /**
     * @param string $userName      API login (usually ends with "-api").
     * @param string $password      API password.
     * @param string $gatewayUrl    REST base URL, e.g. https://payment.alfabank.ru/payment/rest/
     * @param string $callbackToken Symmetric callback token for HMAC verification.
     */
    public function __construct(string $userName, string $password, string $gatewayUrl, string $callbackToken = '')
    {
        $this->userName      = $userName;
        $this->password      = $password;
        $this->gatewayUrl    = $gatewayUrl !== '' ? rtrim($gatewayUrl, '/') . '/' : '';
        $this->callbackToken = $callbackToken;
        $this->client        = \Config\Services::curlrequest();
    }

    public function registerOrder(string $orderNumber, int $amount, string $returnUrl, array $options = []): ?object
    {
        $params = array_merge([
            'userName'    => $this->userName,
            'password'    => $this->password,
            'orderNumber' => $orderNumber,
            'amount'      => $amount,
            'returnUrl'   => $returnUrl,
        ], $options);

        $response = $this->request('register.do', $params);

        return $this->parseRegisterResponse($response);
    }

    /**
     * Normalises a raw register.do response into the interface result shape.
     *
     * @param object|null $response Decoded gateway response, or null on transport error.
     * @return object|null
     */
    public function parseRegisterResponse(?object $response): ?object
    {
        if ($response === null) {
            return null;
        }

        if (isset($response->errorCode) && (int) $response->errorCode !== 0) {
            return (object) [
                'success'      => false,
                'errorCode'    => (string) $response->errorCode,
                'errorMessage' => $response->errorMessage ?? '',
            ];
        }

        if (empty($response->orderId) || empty($response->formUrl)) {
            return (object) [
                'success'      => false,
                'errorCode'    => 'INVALID_RESPONSE',
                'errorMessage' => $response->errorMessage ?? 'Invalid gateway response',
            ];
        }

        return (object) [
            'success' => true,
            'orderId' => (string) $response->orderId,
            'formUrl' => (string) $response->formUrl,
        ];
    }

    public function getOrderStatus(string $orderId): ?object
    {
        return $this->request('getOrderStatusExtended.do', [
            'userName' => $this->userName,
            'password' => $this->password,
            'orderId'  => $orderId,
        ]);
    }

    public function refund(string $orderId, int $amount): bool
    {
        $response = $this->request('refund.do', [
            'userName' => $this->userName,
            'password' => $this->password,
            'orderId'  => $orderId,
            'amount'   => $amount,
        ]);

        if ($response === null) {
            return false;
        }

        return !isset($response->errorCode) || (int) $response->errorCode === 0;
    }

    public function verifyCallback(array $params): bool
    {
        $checksum = $params['checksum'] ?? null;

        if (empty($checksum) || $this->callbackToken === '') {
            return false;
        }

        $expected = $this->calculateChecksum($params, $this->callbackToken);

        return hash_equals($expected, strtoupper((string) $checksum));
    }

    /**
     * Computes the HMAC-SHA256 checksum over the callback parameters.
     *
     * The "checksum" key itself is excluded; remaining keys are sorted
     * alphabetically and concatenated as "key;value;".
     *
     * @param array  $params Callback parameters.
     * @param string $token  Symmetric callback token.
     * @return string Uppercase hex digest.
     */
    public function calculateChecksum(array $params, string $token): string
    {
        unset($params['checksum'], $params['sign_alias']);
        ksort($params, SORT_STRING);

        $data = '';
        foreach ($params as $key => $value) {
            $data .= $key . ';' . $value . ';';
        }

        return strtoupper(hash_hmac('sha256', $data, $token));
    }

    public function mapStatus(?int $orderStatus): string
    {
        switch ($orderStatus) {
            case 2:
                return 'paid';
            case 3:
                return 'canceled';
            case 4:
                return 'refunded';
            case 6:
                return 'failed';
            case 0:  // registered, not paid
            case 1:  // amount held (two-stage)
            case 5:  // pending ACS verification
            default:
                return 'pending';
        }
    }

    /**
     * Performs a POST request to a gateway REST method.
     *
     * @param string $method REST method, e.g. "register.do".
     * @param array  $params Request parameters.
     * @return object|null Decoded JSON object, or null on transport/parse error.
     */
    private function request(string $method, array $params): ?object
    {
        if ($this->gatewayUrl === '') {
            log_message('error', 'AlfaBankClient: gateway URL is not configured');
            return null;
        }

        try {
            $response = $this->client
                ->setHeader('Content-Type', 'application/x-www-form-urlencoded')
                ->setBody(http_build_query($params))
                ->post($this->gatewayUrl . $method);

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            $decoded = json_decode($response->getBody());

            return is_object($decoded) ? $decoded : null;
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return null;
        }
    }
}
