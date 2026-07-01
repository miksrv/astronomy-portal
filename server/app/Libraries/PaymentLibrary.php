<?php

namespace App\Libraries;

use App\Entities\PaymentEntity;
use App\Models\PaymentsModel;
use CodeIgniter\I18n\Time;
use InvalidArgumentException;

/**
 * Gateway-agnostic acquiring facade.
 *
 * Owns the lifecycle of `payments` rows and delegates all provider-specific
 * work to a {@see PaymentGatewayInterface}. Domain code (e.g. the Events
 * controller) calls this library and never touches a gateway directly, so the
 * mechanism is reusable for any payable entity.
 *
 * Configuration is read from environment variables:
 *   payment.gateway                 — gateway name (default "alfabank")
 *   payment.currency                — ISO 4217 numeric currency (default "810" / RUB)
 *   payment.sessionTimeoutSecs      — order lifetime / seat-hold TTL (default 1200)
 *   payment.alfabank.environment    — 'test' (rbsuat sandbox) or 'production' (default)
 *   payment.alfabank.token          — Alfa-Bank payment token (preferred; required for "r-login")
 *   payment.alfabank.userName       — Alfa-Bank API login (fallback when no token is set)
 *   payment.alfabank.password       — Alfa-Bank API password (fallback when no token is set)
 *   payment.alfabank.gatewayUrl     — Alfa-Bank REST base URL
 *   payment.alfabank.callbackToken  — Alfa-Bank symmetric callback token
 *   payment.alfabank.test.*         — same keys for the 'test' environment
 */
class PaymentLibrary
{
    private PaymentGatewayInterface $gateway;
    private PaymentsModel $model;
    private string $gatewayName;

    /**
     * @param PaymentGatewayInterface|null $gateway Injectable gateway (tests); defaults to the configured one.
     * @param PaymentsModel|null           $model   Injectable model (tests); defaults to a new PaymentsModel.
     */
    public function __construct(?PaymentGatewayInterface $gateway = null, ?PaymentsModel $model = null)
    {
        $this->gatewayName = getenv('payment.gateway') ?: 'alfabank';
        $this->gateway     = $gateway ?? self::createGateway($this->gatewayName);
        $this->model       = $model ?? new PaymentsModel();
    }

    /**
     * Factory: builds a gateway client from environment configuration.
     *
     * @throws InvalidArgumentException When the gateway name is unknown.
     */
    public static function createGateway(string $name): PaymentGatewayInterface
    {
        switch ($name) {
            case 'alfabank':
                // 'test' uses the rbsuat sandbox (test cards, no real money) with
                // its own UAT credentials under the payment.alfabank.test.* keys;
                // any other value uses the live cabinet credentials.
                $prefix = (getenv('payment.alfabank.environment') ?: 'production') === 'test'
                    ? 'payment.alfabank.test.'
                    : 'payment.alfabank.';

                return new AlfaBankClient(
                    (string) getenv($prefix . 'userName'),
                    (string) getenv($prefix . 'password'),
                    (string) getenv($prefix . 'gatewayUrl'),
                    (string) getenv($prefix . 'callbackToken'),
                    (string) getenv($prefix . 'token')
                );
            default:
                throw new InvalidArgumentException("Unknown payment gateway: {$name}");
        }
    }

    /**
     * Registers an order with the gateway and persists a `payments` row.
     *
     * @param string      $entityType Domain entity type, e.g. "event_booking".
     * @param string      $entityId   Domain entity id (the thing being paid for).
     * @param int         $amount     Amount in kopecks.
     * @param string      $description Human-readable order description.
     * @param string      $returnUrl  URL the customer returns to after payment.
     * @param string|null $failUrl    Optional URL for failed payments.
     *
     * @return PaymentEntity|null The pending payment (with formUrl), or null when registration failed.
     */
    public function createPayment(
        string $entityType,
        string $entityId,
        int $amount,
        string $description,
        string $returnUrl,
        ?string $failUrl = null
    ): ?PaymentEntity {
        $currency       = (string) (getenv('payment.currency') ?: '810');
        $sessionTimeout = (int) (getenv('payment.sessionTimeoutSecs') ?: 1200);
        $orderNumber    = $entityId . '-' . substr(uniqid(), -8);

        $options = [
            'description'        => $description,
            'currency'          => $currency,
            'sessionTimeoutSecs' => $sessionTimeout,
            'language'           => 'ru',
        ];

        if ($failUrl !== null) {
            $options['failUrl'] = $failUrl;
        }

        $result = $this->gateway->registerOrder($orderNumber, $amount, $returnUrl, $options);

        if ($result === null || empty($result->success)) {
            // Persist a failed payment for auditing.
            $this->model->insert([
                'gateway'       => $this->gatewayName,
                'order_number'  => $orderNumber,
                'entity_type'   => $entityType,
                'entity_id'     => $entityId,
                'amount'        => $amount,
                'currency'      => $currency,
                'status'        => 'failed',
                'error_code'    => $result->errorCode ?? 'GATEWAY_ERROR',
                'error_message' => $result->errorMessage ?? 'Gateway request failed',
            ]);

            return null;
        }

        $this->model->insert([
            'gateway'      => $this->gatewayName,
            'order_number' => $orderNumber,
            'order_id'     => $result->orderId,
            'entity_type'  => $entityType,
            'entity_id'    => $entityId,
            'amount'       => $amount,
            'currency'     => $currency,
            'status'       => 'pending',
            'form_url'     => $result->formUrl,
            // App-timezone wall-clock, consistent with the expiry sweep in
            // PaymentsModel::getExpiredPendingIds() (also app-timezone "now").
            'expires_at'   => (new Time('now'))->addSeconds($sessionTimeout)->toDateTimeString(),
        ]);

        // order_number is unique, so this reliably returns the row just inserted.
        return $this->model->findByOrderNumber($orderNumber);
    }

    /**
     * Looks up a payment by its gateway order id.
     */
    public function findByOrderId(string $orderId): ?PaymentEntity
    {
        return $this->model->findByOrderId($orderId);
    }

    /**
     * Re-fetches the authoritative status from the gateway and persists it.
     *
     * Terminal statuses (paid, refunded) short-circuit without a gateway call.
     *
     * @return string Normalised status (new|pending|paid|failed|canceled|refunded).
     */
    public function getVerifiedStatus(PaymentEntity $payment): string
    {
        if (in_array($payment->status, ['paid', 'refunded'], true)) {
            return $payment->status;
        }

        $remote = $this->gateway->getOrderStatus((string) $payment->order_id);

        if ($remote === null) {
            return $payment->status;
        }

        $status = $this->gateway->mapStatus(
            isset($remote->orderStatus) ? (int) $remote->orderStatus : null
        );

        $failureReason = in_array($status, ['failed', 'canceled'], true)
            ? $this->gateway->extractFailureReason($remote)
            : null;

        $this->applyStatus($payment, $status, $failureReason);

        return $status;
    }

    /**
     * Verifies a gateway callback's authenticity.
     */
    public function verifyCallbackParams(array $params): bool
    {
        return $this->gateway->verifyCallback($params);
    }

    /**
     * Reconciles a verified callback against the stored payment.
     *
     * The caller must verify authenticity via {@see verifyCallbackParams()} first.
     *
     * @return PaymentEntity|null The refreshed payment, or null when not found.
     */
    public function handleCallback(array $params): ?PaymentEntity
    {
        $orderId = $params['mdOrder'] ?? $params['orderId'] ?? null;

        if (empty($orderId)) {
            return null;
        }

        $payment = $this->model->findByOrderId((string) $orderId);

        if ($payment === null) {
            return null;
        }

        $this->getVerifiedStatus($payment);

        return $this->model->find($payment->id);
    }

    /**
     * Refunds a paid payment in full.
     */
    public function refund(PaymentEntity $payment): bool
    {
        if ($payment->status !== 'paid') {
            return false;
        }

        $ok = $this->gateway->refund((string) $payment->order_id, (int) $payment->amount);

        if ($ok) {
            $this->model->update($payment->id, ['status' => 'refunded']);
        }

        return $ok;
    }

    /**
     * Marks all expired, unpaid payments as failed.
     *
     * @return array<string> Ids of the payments that were expired.
     */
    public function releaseExpired(): array
    {
        $ids = $this->model->getExpiredPendingIds();

        if (!empty($ids)) {
            $this->model->whereIn('id', $ids)->set('status', 'failed')->update();
        }

        return $ids;
    }

    /**
     * Persists a normalised status (and paid_at on first transition to paid,
     * or error_code/error_message on first transition to failed/canceled).
     *
     * @param array{code: string|null, message: string|null}|null $failureReason
     */
    private function applyStatus(PaymentEntity $payment, string $status, ?array $failureReason = null): void
    {
        if ($payment->status === $status) {
            return;
        }

        $update = ['status' => $status];

        if ($status === 'paid' && empty($payment->paid_at)) {
            $update['paid_at'] = (new Time('now'))->toDateTimeString();
        }

        if ($failureReason !== null) {
            if ($failureReason['code'] !== null) {
                $update['error_code'] = $failureReason['code'];
            }

            if ($failureReason['message'] !== null) {
                $update['error_message'] = $failureReason['message'];
            }
        }

        $this->model->update($payment->id, $update);
    }
}
