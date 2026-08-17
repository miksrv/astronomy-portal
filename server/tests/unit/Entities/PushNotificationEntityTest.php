<?php

use App\Entities\PushNotificationEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class PushNotificationEntityTest extends CIUnitTestCase
{
    // --- Constants ---

    public function testStatusDraftConstantValue(): void
    {
        $this->assertSame('draft', PushNotificationEntity::STATUS_DRAFT);
    }

    public function testStatusSendingConstantValue(): void
    {
        $this->assertSame('sending', PushNotificationEntity::STATUS_SENDING);
    }

    public function testStatusCompletedConstantValue(): void
    {
        $this->assertSame('completed', PushNotificationEntity::STATUS_COMPLETED);
    }

    public function testStatusPausedConstantValue(): void
    {
        $this->assertSame('paused', PushNotificationEntity::STATUS_PAUSED);
    }

    // --- Default attribute values ---

    public function testNewInstanceDefaultStatusIsDraft(): void
    {
        $entity = new PushNotificationEntity();
        $this->assertSame('draft', $entity->status);
    }

    public function testNewInstanceDefaultAudienceTypeIsAll(): void
    {
        $entity = new PushNotificationEntity();
        $this->assertSame('all', $entity->audience_type);
    }

    public function testNewInstanceDefaultTotalCountIsZero(): void
    {
        $entity = new PushNotificationEntity();
        $this->assertSame(0, $entity->total_count);
    }

    public function testNewInstanceDefaultSentCountIsZero(): void
    {
        $entity = new PushNotificationEntity();
        $this->assertSame(0, $entity->sent_count);
    }

    public function testNewInstanceDefaultErrorCountIsZero(): void
    {
        $entity = new PushNotificationEntity();
        $this->assertSame(0, $entity->error_count);
    }

    public function testNewInstanceDefaultIdIsEmpty(): void
    {
        // 'id' is cast to 'string'; CI4 Entity converts null attribute to '' on get
        $entity = new PushNotificationEntity();
        $this->assertEmpty($entity->id);
    }

    // --- Attribute assignment ---

    public function testSettingTitleStoresValue(): void
    {
        $entity        = new PushNotificationEntity();
        $entity->title = 'Test Title';
        $this->assertSame('Test Title', $entity->title);
    }

    public function testSettingTotalCountAsIntegerStoresInteger(): void
    {
        $entity              = new PushNotificationEntity();
        $entity->total_count = 5;
        $this->assertSame(5, $entity->total_count);
        $this->assertIsInt($entity->total_count);
    }
}
