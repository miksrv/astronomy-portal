<?php

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * Guards for the event booking & payment endpoints.
 *
 * Booking, cancellation and payment-status require authentication and respond
 * 401 before touching the database. The async callback is public but must
 * reject requests with an invalid (or absent) signature before any side effect.
 *
 * @internal
 */
final class EventsPaymentGuardTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    public function testBookingWithoutTokenReturns401(): void
    {
        $result = $this->post('events/booking', []);
        $result->assertStatus(401);
    }

    public function testCancelWithoutTokenReturns401(): void
    {
        $result = $this->post('events/cancel', []);
        $result->assertStatus(401);
    }

    public function testTicketWithoutTokenReturns401(): void
    {
        // The ticket endpoint must reject unauthenticated requests before any
        // DB access or image rendering.
        $result = $this->get('events/ticket/abc1234567890');
        $result->assertStatus(401);
    }

    public function testPaymentStatusWithoutTokenReturns401(): void
    {
        $result = $this->post('events/payment/status', []);
        $result->assertStatus(401);
    }

    public function testPaymentCallbackWithInvalidSignatureReturns400(): void
    {
        // No callback token is configured in the test env, so any signature is
        // rejected. The endpoint must fail validation before any DB access.
        $result = $this->get('events/payment/callback?mdOrder=abc&status=1&checksum=DEADBEEF');
        $result->assertStatus(400);
    }

    public function testPaymentCallbackWithoutParamsReturns400(): void
    {
        $result = $this->post('events/payment/callback', []);
        $result->assertStatus(400);
    }
}
