<?php

use App\Entities\PaymentEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class PaymentEntityTest extends CIUnitTestCase
{
    // --- Casts ---

    public function testAmountCastToInteger(): void
    {
        $entity         = new PaymentEntity();
        $entity->amount = '10000';
        $this->assertSame(10000, $entity->amount);
        $this->assertIsInt($entity->amount);
    }

    // --- Datamap (camelCase ↔ snake_case) ---

    public function testOrderIdDatamap(): void
    {
        $entity = new PaymentEntity();
        $entity->injectRawData(['order_id' => 'oid-123']);
        $this->assertSame('oid-123', $entity->orderId);
    }

    public function testFormUrlDatamap(): void
    {
        $entity = new PaymentEntity();
        $entity->injectRawData(['form_url' => 'https://pay/form']);
        $this->assertSame('https://pay/form', $entity->formUrl);
    }

    public function testEntityTypeAndEntityIdDatamap(): void
    {
        $entity = new PaymentEntity();
        $entity->injectRawData(['entity_type' => 'event_booking', 'entity_id' => 'evt-1']);
        $this->assertSame('event_booking', $entity->entityType);
        $this->assertSame('evt-1', $entity->entityId);
    }

    public function testWritingViaDatamapSetsUnderlyingAttribute(): void
    {
        $entity              = new PaymentEntity();
        $entity->orderNumber = 'evt-1-abcdef';
        $this->assertSame('evt-1-abcdef', $entity->order_number);
    }

    // --- Date fields ---

    public function testPaidAtIsInDatesList(): void
    {
        $entity     = new PaymentEntity();
        $reflection = new ReflectionProperty($entity, 'dates');
        $reflection->setAccessible(true);
        $this->assertContains('paid_at', $reflection->getValue($entity));
        $this->assertContains('expires_at', $reflection->getValue($entity));
    }
}
