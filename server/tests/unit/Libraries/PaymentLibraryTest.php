<?php

use App\Entities\PaymentEntity;
use App\Libraries\AlfaBankClient;
use App\Libraries\PaymentGatewayInterface;
use App\Libraries\PaymentLibrary;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Test double recording how PaymentLibrary drives a gateway.
 */
final class FakePaymentGateway implements PaymentGatewayInterface
{
    public int $getOrderStatusCalls = 0;
    public bool $verifyResult       = true;

    public function registerOrder(string $orderNumber, int $amount, string $returnUrl, array $options = []): ?object
    {
        return (object) ['success' => true, 'orderId' => 'oid', 'formUrl' => 'https://pay/form'];
    }

    public function getOrderStatus(string $orderId): ?object
    {
        $this->getOrderStatusCalls++;
        return (object) ['orderStatus' => 2];
    }

    public function refund(string $orderId, int $amount): bool
    {
        return true;
    }

    public function verifyCallback(array $params): bool
    {
        return $this->verifyResult;
    }

    public function mapStatus(?int $orderStatus): string
    {
        return $orderStatus === 2 ? 'paid' : 'pending';
    }
}

/**
 * Unit tests for PaymentLibrary that avoid the database by exercising the
 * gateway-factory and the short-circuit / guard branches only.
 *
 * @internal
 */
final class PaymentLibraryTest extends CIUnitTestCase
{
    // --- createGateway() factory ---

    public function testCreateGatewayReturnsAlfaBankForAlfabank(): void
    {
        $this->assertInstanceOf(AlfaBankClient::class, PaymentLibrary::createGateway('alfabank'));
    }

    public function testCreateGatewayThrowsForUnknownGateway(): void
    {
        $this->expectException(InvalidArgumentException::class);
        PaymentLibrary::createGateway('paypal');
    }

    public function testCreateGatewayUsesTestCredentialsWhenEnvironmentIsTest(): void
    {
        putenv('payment.alfabank.environment=test');
        putenv('payment.alfabank.test.gatewayUrl=https://alfa.rbsuat.com/payment/rest/');

        try {
            $gateway = PaymentLibrary::createGateway('alfabank');

            $ref = new ReflectionProperty($gateway, 'gatewayUrl');
            $ref->setAccessible(true);

            $this->assertSame('https://alfa.rbsuat.com/payment/rest/', $ref->getValue($gateway));
        } finally {
            putenv('payment.alfabank.environment');
            putenv('payment.alfabank.test.gatewayUrl');
        }
    }

    // --- getVerifiedStatus() terminal short-circuit ---

    public function testGetVerifiedStatusShortCircuitsForPaid(): void
    {
        $gateway = new FakePaymentGateway();
        $library = new PaymentLibrary($gateway);

        $payment         = new PaymentEntity();
        $payment->status = 'paid';

        $this->assertSame('paid', $library->getVerifiedStatus($payment));
        $this->assertSame(0, $gateway->getOrderStatusCalls, 'Terminal status must not hit the gateway');
    }

    public function testGetVerifiedStatusShortCircuitsForRefunded(): void
    {
        $gateway = new FakePaymentGateway();
        $library = new PaymentLibrary($gateway);

        $payment         = new PaymentEntity();
        $payment->status = 'refunded';

        $this->assertSame('refunded', $library->getVerifiedStatus($payment));
        $this->assertSame(0, $gateway->getOrderStatusCalls);
    }

    // --- verifyCallbackParams() delegation ---

    public function testVerifyCallbackParamsDelegatesToGateway(): void
    {
        $gateway = new FakePaymentGateway();
        $library = new PaymentLibrary($gateway);

        $gateway->verifyResult = true;
        $this->assertTrue($library->verifyCallbackParams(['checksum' => 'x']));

        $gateway->verifyResult = false;
        $this->assertFalse($library->verifyCallbackParams(['checksum' => 'x']));
    }

    // --- handleCallback() guard ---

    public function testHandleCallbackReturnsNullWhenOrderIdMissing(): void
    {
        $library = new PaymentLibrary(new FakePaymentGateway());
        $this->assertNull($library->handleCallback(['status' => '1']));
    }

    // --- refund() guard ---

    public function testRefundReturnsFalseForUnpaidPayment(): void
    {
        $library = new PaymentLibrary(new FakePaymentGateway());

        $payment         = new PaymentEntity();
        $payment->status = 'pending';

        $this->assertFalse($library->refund($payment));
    }
}
