<?php

use App\Libraries\AlfaBankClient;
use App\Libraries\PaymentGatewayInterface;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Pure unit tests for AlfaBankClient.
 *
 * Covers the security-critical and parsing logic that needs no network:
 * HMAC callback verification, status mapping and register.do response parsing.
 *
 * @internal
 */
final class AlfaBankClientTest extends CIUnitTestCase
{
    private const TOKEN = 'super-secret-callback-token';

    private AlfaBankClient $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = new AlfaBankClient('login-api', 'password', 'https://web.rbsuat.com/ab/rest', self::TOKEN);
    }

    // --- contract ---

    public function testImplementsGatewayInterface(): void
    {
        $this->assertInstanceOf(PaymentGatewayInterface::class, $this->client);
    }

    public function testGatewayUrlGetsTrailingSlash(): void
    {
        $reflection = new ReflectionProperty($this->client, 'gatewayUrl');
        $reflection->setAccessible(true);
        $this->assertSame('https://web.rbsuat.com/ab/rest/', $reflection->getValue($this->client));
    }

    public function testEmptyGatewayUrlStaysEmpty(): void
    {
        $client     = new AlfaBankClient('u', 'p', '', '');
        $reflection = new ReflectionProperty($client, 'gatewayUrl');
        $reflection->setAccessible(true);
        $this->assertSame('', $reflection->getValue($client));
    }

    // --- authParams() ---

    public function testAuthParamsUsesUserNamePasswordByDefault(): void
    {
        $params = $this->invokeAuthParams($this->client);

        $this->assertSame(['userName' => 'login-api', 'password' => 'password'], $params);
        $this->assertArrayNotHasKey('token', $params);
    }

    public function testAuthParamsUsesTokenWhenConfigured(): void
    {
        $client = new AlfaBankClient('login-api', 'password', 'https://x/', '', 'pay-token-123');

        $params = $this->invokeAuthParams($client);

        $this->assertSame(['token' => 'pay-token-123'], $params);
        $this->assertArrayNotHasKey('userName', $params);
        $this->assertArrayNotHasKey('password', $params);
    }

    /**
     * @return array<string, string>
     */
    private function invokeAuthParams(AlfaBankClient $client): array
    {
        $method = new ReflectionMethod($client, 'authParams');
        $method->setAccessible(true);

        return $method->invoke($client);
    }

    // --- calculateChecksum() ---

    public function testCalculateChecksumMatchesSortedKeyValueFormat(): void
    {
        $params = [
            'orderNumber' => '42',
            'amount'      => '10000',
            'status'      => '1',
            'mdOrder'     => 'abc-123',
        ];

        // Independently build the alphabetically-sorted "key;value;" string.
        $expectedData = 'amount;10000;mdOrder;abc-123;orderNumber;42;status;1;';
        $expected     = strtoupper(hash_hmac('sha256', $expectedData, self::TOKEN));

        $this->assertSame($expected, $this->client->calculateChecksum($params, self::TOKEN));
    }

    public function testCalculateChecksumIgnoresChecksumKey(): void
    {
        $params = ['amount' => '500', 'status' => '1'];

        $withChecksum = $params + ['checksum' => 'SHOULD_BE_IGNORED'];

        $this->assertSame(
            $this->client->calculateChecksum($params, self::TOKEN),
            $this->client->calculateChecksum($withChecksum, self::TOKEN)
        );
    }

    public function testCalculateChecksumIsOrderIndependent(): void
    {
        $a = ['amount' => '500', 'status' => '1', 'mdOrder' => 'x'];
        $b = ['mdOrder' => 'x', 'status' => '1', 'amount' => '500'];

        $this->assertSame(
            $this->client->calculateChecksum($a, self::TOKEN),
            $this->client->calculateChecksum($b, self::TOKEN)
        );
    }

    // --- verifyCallback() ---

    public function testVerifyCallbackAcceptsValidChecksum(): void
    {
        $params             = ['amount' => '10000', 'mdOrder' => 'abc-123', 'status' => '1'];
        $params['checksum'] = $this->client->calculateChecksum($params, self::TOKEN);

        $this->assertTrue($this->client->verifyCallback($params));
    }

    public function testVerifyCallbackAcceptsLowercaseChecksum(): void
    {
        $params             = ['amount' => '10000', 'mdOrder' => 'abc-123', 'status' => '1'];
        $params['checksum'] = strtolower($this->client->calculateChecksum($params, self::TOKEN));

        $this->assertTrue($this->client->verifyCallback($params));
    }

    public function testVerifyCallbackRejectsTamperedAmount(): void
    {
        $params             = ['amount' => '10000', 'mdOrder' => 'abc-123', 'status' => '1'];
        $params['checksum'] = $this->client->calculateChecksum($params, self::TOKEN);

        // Attacker bumps the amount after the checksum was computed.
        $params['amount'] = '1';

        $this->assertFalse($this->client->verifyCallback($params));
    }

    public function testVerifyCallbackRejectsMissingChecksum(): void
    {
        $this->assertFalse($this->client->verifyCallback(['amount' => '10000']));
    }

    public function testVerifyCallbackRejectsWhenTokenNotConfigured(): void
    {
        $client             = new AlfaBankClient('u', 'p', 'https://x/', '');
        $params             = ['amount' => '10000'];
        $params['checksum'] = $client->calculateChecksum($params, 'anything');

        $this->assertFalse($client->verifyCallback($params));
    }

    // --- mapStatus() ---

    public function testMapStatusDepositedIsPaid(): void
    {
        $this->assertSame('paid', $this->client->mapStatus(2));
    }

    public function testMapStatusReversedIsCanceled(): void
    {
        $this->assertSame('canceled', $this->client->mapStatus(3));
    }

    public function testMapStatusRefundedIsRefunded(): void
    {
        $this->assertSame('refunded', $this->client->mapStatus(4));
    }

    public function testMapStatusDeclinedIsFailed(): void
    {
        $this->assertSame('failed', $this->client->mapStatus(6));
    }

    public function testMapStatusRegisteredIsPending(): void
    {
        $this->assertSame('pending', $this->client->mapStatus(0));
    }

    public function testMapStatusHeldIsPending(): void
    {
        $this->assertSame('pending', $this->client->mapStatus(1));
    }

    public function testMapStatusAcsPendingIsPending(): void
    {
        $this->assertSame('pending', $this->client->mapStatus(5));
    }

    public function testMapStatusUnknownCodeIsPending(): void
    {
        $this->assertSame('pending', $this->client->mapStatus(99));
    }

    public function testMapStatusNullIsPending(): void
    {
        $this->assertSame('pending', $this->client->mapStatus(null));
    }

    // --- extractFailureReason() ---

    public function testExtractFailureReasonReturnsActionCodeAndDescription(): void
    {
        $reason = $this->client->extractFailureReason((object) [
            'actionCode'            => -2005,
            'actionCodeDescription' => 'Операция отклонена. Обратитесь в банк, выпустивший карту.',
        ]);

        $this->assertSame('-2005', $reason['code']);
        $this->assertSame('Операция отклонена. Обратитесь в банк, выпустивший карту.', $reason['message']);
    }

    public function testExtractFailureReasonNullWhenNoDetail(): void
    {
        $this->assertNull($this->client->extractFailureReason((object) ['orderStatus' => 6]));
    }

    public function testExtractFailureReasonHandlesMissingDescription(): void
    {
        $reason = $this->client->extractFailureReason((object) ['actionCode' => -2005]);

        $this->assertSame('-2005', $reason['code']);
        $this->assertNull($reason['message']);
    }

    // --- parseRegisterResponse() ---

    public function testParseRegisterResponseNullStaysNull(): void
    {
        $this->assertNull($this->client->parseRegisterResponse(null));
    }

    public function testParseRegisterResponseSuccess(): void
    {
        $result = $this->client->parseRegisterResponse((object) [
            'orderId' => 'oid-1',
            'formUrl' => 'https://pay/form',
        ]);

        $this->assertTrue($result->success);
        $this->assertSame('oid-1', $result->orderId);
        $this->assertSame('https://pay/form', $result->formUrl);
    }

    public function testParseRegisterResponseGatewayErrorCode(): void
    {
        $result = $this->client->parseRegisterResponse((object) [
            'errorCode'    => 1,
            'errorMessage' => 'Order already exists',
        ]);

        $this->assertFalse($result->success);
        $this->assertSame('1', $result->errorCode);
        $this->assertSame('Order already exists', $result->errorMessage);
    }

    public function testParseRegisterResponseErrorCodeZeroIsNotAnError(): void
    {
        $result = $this->client->parseRegisterResponse((object) [
            'errorCode' => 0,
            'orderId'   => 'oid-2',
            'formUrl'   => 'https://pay/form2',
        ]);

        $this->assertTrue($result->success);
        $this->assertSame('oid-2', $result->orderId);
    }

    public function testParseRegisterResponseMissingFieldsIsFailure(): void
    {
        $result = $this->client->parseRegisterResponse((object) ['orderId' => 'oid-only']);

        $this->assertFalse($result->success);
        $this->assertSame('INVALID_RESPONSE', $result->errorCode);
    }
}
