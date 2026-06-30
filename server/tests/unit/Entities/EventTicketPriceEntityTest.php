<?php

use App\Entities\EventEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Tests the ticket_price column added for paid stargazing events.
 *
 * @internal
 */
final class EventTicketPriceEntityTest extends CIUnitTestCase
{
    public function testTicketPriceCastToFloat(): void
    {
        $entity               = new EventEntity();
        $entity->ticket_price = '150.50';
        $this->assertSame(150.5, $entity->ticket_price);
        $this->assertIsFloat($entity->ticket_price);
    }

    public function testTicketPriceZeroIsFloatZero(): void
    {
        $entity               = new EventEntity();
        $entity->ticket_price = '0';
        $this->assertSame(0.0, $entity->ticket_price);
    }

    public function testTicketPriceDatamapAlias(): void
    {
        $entity              = new EventEntity();
        $entity->ticketPrice = '300';
        $this->assertSame(300.0, $entity->ticket_price);
        $this->assertSame(300.0, $entity->ticketPrice);
    }

    /**
     * Regression: the booking controller derives the price as
     * `(float) ($event->ticketPrice ?? 0)`. The `??` operator relies on
     * __isset(), which returns false for the raw datamap *target* column
     * (`ticket_price`) — so the raw form silently coalesced to 0 and pushed
     * every paid booking through the free branch. The datamap alias must
     * remain isset-visible so a paid event is detected as paid.
     */
    public function testTicketPriceCoalesceViaDatamapDetectsPaidEvent(): void
    {
        $entity              = new EventEntity();
        $entity->ticketPrice = '500';

        $this->assertTrue(isset($entity->ticketPrice));
        $this->assertSame(500.0, (float) ($entity->ticketPrice ?? 0));
        $this->assertGreaterThan(0, (float) ($entity->ticketPrice ?? 0));
    }
}
