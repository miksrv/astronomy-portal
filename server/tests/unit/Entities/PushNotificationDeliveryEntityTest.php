<?php

use App\Entities\PushNotificationDeliveryEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class PushNotificationDeliveryEntityTest extends CIUnitTestCase
{
    // --- Constants ---

    public function testStatusQueuedConstantValue(): void
    {
        $this->assertSame('queued', PushNotificationDeliveryEntity::STATUS_QUEUED);
    }

    public function testStatusSentConstantValue(): void
    {
        $this->assertSame('sent', PushNotificationDeliveryEntity::STATUS_SENT);
    }

    public function testStatusErrorConstantValue(): void
    {
        $this->assertSame('error', PushNotificationDeliveryEntity::STATUS_ERROR);
    }

    public function testStatusRejectedConstantValue(): void
    {
        $this->assertSame('rejected', PushNotificationDeliveryEntity::STATUS_REJECTED);
    }

    // --- Default attribute values ---

    public function testNewInstanceDefaultStatusIsQueued(): void
    {
        $entity = new PushNotificationDeliveryEntity();
        $this->assertSame('queued', $entity->status);
    }

    public function testNewInstanceDefaultNotificationIdIsEmpty(): void
    {
        // cast to 'string'; CI4 Entity converts null attribute to '' on get
        $entity = new PushNotificationDeliveryEntity();
        $this->assertEmpty($entity->notification_id);
    }

    public function testNewInstanceDefaultSubscriptionIdIsEmpty(): void
    {
        $entity = new PushNotificationDeliveryEntity();
        $this->assertEmpty($entity->subscription_id);
    }

    public function testNewInstanceDefaultErrorMessageIsEmpty(): void
    {
        $entity = new PushNotificationDeliveryEntity();
        $this->assertEmpty($entity->error_message);
    }

    public function testNewInstanceDefaultSentAtIsNull(): void
    {
        $entity = new PushNotificationDeliveryEntity();
        $this->assertNull($entity->sent_at);
    }

    // --- Attribute assignment ---

    public function testSettingStatusToSentStoresValue(): void
    {
        $entity         = new PushNotificationDeliveryEntity();
        $entity->status = PushNotificationDeliveryEntity::STATUS_SENT;
        $this->assertSame('sent', $entity->status);
    }

    // --- Dates list ---

    public function testSentAtIsInDatesList(): void
    {
        $entity     = new PushNotificationDeliveryEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('sent_at', $prop->getValue($entity));
    }

    public function testCreatedAtIsInDatesList(): void
    {
        $entity     = new PushNotificationDeliveryEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('created_at', $prop->getValue($entity));
    }

    public function testUpdatedAtIsInDatesList(): void
    {
        $entity     = new PushNotificationDeliveryEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('updated_at', $prop->getValue($entity));
    }
}
