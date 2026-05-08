<?php

use App\Entities\MailingEmailEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class MailingEmailEntityTest extends CIUnitTestCase
{
    // --- Constants ---

    public function testStatusQueuedConstantValue(): void
    {
        $this->assertSame('queued', MailingEmailEntity::STATUS_QUEUED);
    }

    public function testStatusSentConstantValue(): void
    {
        $this->assertSame('sent', MailingEmailEntity::STATUS_SENT);
    }

    public function testStatusErrorConstantValue(): void
    {
        $this->assertSame('error', MailingEmailEntity::STATUS_ERROR);
    }

    public function testStatusRejectedConstantValue(): void
    {
        $this->assertSame('rejected', MailingEmailEntity::STATUS_REJECTED);
    }

    // --- Default attribute values ---

    public function testNewInstanceDefaultLocaleIsRu(): void
    {
        $entity = new MailingEmailEntity();
        $this->assertSame('ru', $entity->locale);
    }

    public function testNewInstanceDefaultStatusIsQueued(): void
    {
        $entity = new MailingEmailEntity();
        $this->assertSame('queued', $entity->status);
    }

    public function testNewInstanceDefaultMailingIdIsEmpty(): void
    {
        // 'mailing_id' cast to 'string'; CI4 Entity converts null attribute to '' on get
        $entity = new MailingEmailEntity();
        $this->assertEmpty($entity->mailing_id);
    }

    public function testNewInstanceDefaultEmailIsEmpty(): void
    {
        // 'email' cast to 'string'; CI4 Entity converts null attribute to '' on get
        $entity = new MailingEmailEntity();
        $this->assertEmpty($entity->email);
    }

    public function testNewInstanceDefaultErrorMessageIsEmpty(): void
    {
        // 'error_message' cast to 'string'; CI4 Entity converts null attribute to '' on get
        $entity = new MailingEmailEntity();
        $this->assertEmpty($entity->error_message);
    }

    public function testNewInstanceDefaultSentAtIsNull(): void
    {
        $entity = new MailingEmailEntity();
        $this->assertNull($entity->sent_at);
    }

    // --- Attribute assignment ---

    public function testSettingEmailStoresValue(): void
    {
        $entity        = new MailingEmailEntity();
        $entity->email = 'user@example.com';
        $this->assertSame('user@example.com', $entity->email);
    }

    public function testSettingStatusToSentStoresValue(): void
    {
        $entity         = new MailingEmailEntity();
        $entity->status = MailingEmailEntity::STATUS_SENT;
        $this->assertSame('sent', $entity->status);
    }

    // --- Dates list ---

    public function testSentAtIsInDatesList(): void
    {
        $entity     = new MailingEmailEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('sent_at', $prop->getValue($entity));
    }

    public function testCreatedAtIsInDatesList(): void
    {
        $entity     = new MailingEmailEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('created_at', $prop->getValue($entity));
    }

    public function testUpdatedAtIsInDatesList(): void
    {
        $entity     = new MailingEmailEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('updated_at', $prop->getValue($entity));
    }
}
