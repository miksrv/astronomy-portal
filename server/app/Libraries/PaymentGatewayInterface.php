<?php

namespace App\Libraries;

/**
 * Contract for an acquiring (online cash register) gateway.
 *
 * Implementations wrap a single provider's REST API (e.g. Alfa-Bank). The
 * generic {@see PaymentLibrary} talks to gateways only through this interface,
 * so adding another provider (Sberbank, СБП, …) means adding one class — no
 * changes to controllers or the `payments` table.
 *
 * All monetary amounts are expressed in the minor currency unit (kopecks).
 */
interface PaymentGatewayInterface
{
    /**
     * Registers a new order with the gateway.
     *
     * @param string $orderNumber Merchant-side unique order number.
     * @param int    $amount      Amount in the minor currency unit (kopecks).
     * @param string $returnUrl   Absolute URL the customer returns to after payment.
     * @param array  $options     Optional extra params (description, failUrl, currency, ...).
     *
     * @return object|null Normalised result on a completed request, or null on a transport error.
     *                     Shape: { success: bool, orderId?: string, formUrl?: string,
     *                              errorCode?: string, errorMessage?: string }.
     */
    public function registerOrder(string $orderNumber, int $amount, string $returnUrl, array $options = []): ?object;

    /**
     * Fetches the raw extended order status from the gateway.
     *
     * @param string $orderId Gateway-side order id.
     * @return object|null The decoded gateway response, or null on a transport error.
     */
    public function getOrderStatus(string $orderId): ?object;

    /**
     * Requests a full or partial refund for a paid order.
     *
     * @param string $orderId Gateway-side order id.
     * @param int    $amount  Amount to refund in kopecks.
     * @return bool True when the gateway accepted the refund.
     */
    public function refund(string $orderId, int $amount): bool;

    /**
     * Verifies the integrity/authenticity of an asynchronous callback.
     *
     * @param array $params The callback query/post parameters as received.
     * @return bool True when the callback is authentic.
     */
    public function verifyCallback(array $params): bool;

    /**
     * Maps a gateway-specific order status code to a normalised status string.
     *
     * @param int|null $orderStatus Gateway status code.
     * @return string One of: new, pending, paid, failed, canceled, refunded.
     */
    public function mapStatus(?int $orderStatus): string;

    /**
     * Extracts a human-readable failure reason (e.g. "card declined by
     * issuer") from a raw {@see getOrderStatus()} response, for a failed or
     * canceled order.
     *
     * @param object $remote Raw response from getOrderStatus().
     * @return array{code: string|null, message: string|null}|null Null when
     *                                                              the response carries no failure detail.
     */
    public function extractFailureReason(object $remote): ?array;
}
