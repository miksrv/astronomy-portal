<?php

use App\Entities\PaymentEntity;
use App\Libraries\PaymentGatewayInterface;
use App\Libraries\PaymentLibrary;
use App\Models\PaymentsModel;
use CodeIgniter\I18n\Time;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * PaymentLibrary::releaseExpired(): a payment the bank gives no outcome for is failed a day
 * after its hold expired, so it stops filling the batch of every run; a recent one stays.
 *
 * @internal
 */
final class PaymentStaleHoldTest extends CIUnitTestCase
{
    /**
     * @param list<PaymentEntity> $expired
     * @return array{0: PaymentLibrary, 1: object} The library and its model, which records the updates
     */
    private function library(array $expired): array
    {
        $gateway = new class () implements PaymentGatewayInterface {
            public function registerOrder(string $orderNumber, int $amount, string $returnUrl, array $options = []): ?object
            {
                return null;
            }

            public function getOrderStatus(string $orderId): ?object
            {
                return null; // the bank doesn't answer
            }

            public function refund(string $orderId, int $amount): object
            {
                return (object) [];
            }

            public function verifyCallback(array $params): bool
            {
                return false;
            }

            public function mapStatus(?int $orderStatus): string
            {
                return 'pending';
            }

            public function extractFailureReason(object $remote): ?array
            {
                return null;
            }
        };

        $model = new class ($expired) extends PaymentsModel {
            public array $updates = [];

            public function __construct(private readonly array $expired)
            {
                parent::__construct();
            }

            public function getExpiredPending(int $limit = 5): array
            {
                return $this->expired;
            }

            public function update($id = null, $row = null): bool
            {
                $this->updates[$id] = $row;

                return true;
            }
        };

        return [new PaymentLibrary($gateway, $model), $model];
    }

    private function payment(string $id, Time $expiresAt): PaymentEntity
    {
        return new PaymentEntity(['id' => $id, 'order_id' => 'o-' . $id, 'status' => 'pending', 'expires_at' => $expiresAt->toDateTimeString()]);
    }

    public function testStaleHoldWithoutOutcomeIsFailed(): void
    {
        $stale  = $this->payment('p1', Time::now()->subHours(PaymentLibrary::STALE_HOLD_HOURS + 1));
        $recent = $this->payment('p2', Time::now()->subMinutes(30));

        [$library, $model] = $this->library([$stale, $recent]);
        $results = $library->releaseExpired();

        $this->assertSame(['failed', 'pending'], array_column($results, 'status'));
        $this->assertSame('failed', $model->updates['p1']['status']);
        $this->assertArrayNotHasKey('p2', $model->updates);
    }
}
