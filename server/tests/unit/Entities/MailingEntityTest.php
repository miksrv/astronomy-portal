<?php

use App\Entities\MailingEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class MailingEntityTest extends CIUnitTestCase
{
    // --- Constants ---

    public function testStatusDraftConstantValue(): void
    {
        $this->assertSame('draft', MailingEntity::STATUS_DRAFT);
    }

    public function testStatusSendingConstantValue(): void
    {
        $this->assertSame('sending', MailingEntity::STATUS_SENDING);
    }

    public function testStatusCompletedConstantValue(): void
    {
        $this->assertSame('completed', MailingEntity::STATUS_COMPLETED);
    }

    public function testStatusPausedConstantValue(): void
    {
        $this->assertSame('paused', MailingEntity::STATUS_PAUSED);
    }

    // --- Default attribute values ---

    public function testNewInstanceDefaultStatusIsDraft(): void
    {
        $entity = new MailingEntity();
        $this->assertSame('draft', $entity->status);
    }

    public function testNewInstanceDefaultTotalCountIsZero(): void
    {
        $entity = new MailingEntity();
        $this->assertSame(0, $entity->total_count);
    }

    public function testNewInstanceDefaultSentCountIsZero(): void
    {
        $entity = new MailingEntity();
        $this->assertSame(0, $entity->sent_count);
    }

    public function testNewInstanceDefaultErrorCountIsZero(): void
    {
        $entity = new MailingEntity();
        $this->assertSame(0, $entity->error_count);
    }

    public function testNewInstanceDefaultIdIsEmpty(): void
    {
        $entity = new MailingEntity();
        // 'id' is cast to 'string'; CI4 Entity converts null attribute to '' on get
        $this->assertEmpty($entity->id);
    }

    // --- Attribute assignment ---

    public function testSettingSubjectStoresValue(): void
    {
        $entity          = new MailingEntity();
        $entity->subject = 'Test Subject';
        $this->assertSame('Test Subject', $entity->subject);
    }

    public function testSettingTotalCountAsIntegerStoresInteger(): void
    {
        $entity              = new MailingEntity();
        $entity->total_count = 5;
        $this->assertSame(5, $entity->total_count);
        $this->assertIsInt($entity->total_count);
    }
}
