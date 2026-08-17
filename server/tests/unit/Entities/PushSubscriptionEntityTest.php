<?php

use App\Entities\PushSubscriptionEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class PushSubscriptionEntityTest extends CIUnitTestCase
{
    // --- Default attribute values ---

    public function testNewInstanceDefaultIdIsEmpty(): void
    {
        // 'id' is cast to 'string'; CI4 Entity converts null attribute to '' on get
        $entity = new PushSubscriptionEntity();
        $this->assertEmpty($entity->id);
    }

    public function testNewInstanceDefaultUserIdIsEmpty(): void
    {
        $entity = new PushSubscriptionEntity();
        $this->assertEmpty($entity->user_id);
    }

    public function testNewInstanceDefaultUserIdIsRealNullNotEmptyString(): void
    {
        // 'user_id' is cast '?string' (nullable), not plain 'string' — an
        // anonymous/guest subscription must read back as real null so
        // callers can reliably tell "unclaimed" apart from "claimed", both
        // in PHP and in the JSON API response.
        $entity = new PushSubscriptionEntity();
        $this->assertNull($entity->user_id);
    }

    public function testNewInstanceDefaultEndpointIsEmpty(): void
    {
        $entity = new PushSubscriptionEntity();
        $this->assertEmpty($entity->endpoint);
    }

    public function testNewInstanceDefaultUserAgentIsEmpty(): void
    {
        $entity = new PushSubscriptionEntity();
        $this->assertEmpty($entity->user_agent);
    }

    // --- Attribute assignment ---

    public function testSettingEndpointStoresValue(): void
    {
        $entity           = new PushSubscriptionEntity();
        $entity->endpoint = 'https://push.example.com/abc123';
        $this->assertSame('https://push.example.com/abc123', $entity->endpoint);
    }

    public function testSettingP256dhStoresValue(): void
    {
        $entity          = new PushSubscriptionEntity();
        $entity->p256dh  = 'some-p256dh-key';
        $this->assertSame('some-p256dh-key', $entity->p256dh);
    }

    public function testSettingAuthKeyStoresValue(): void
    {
        $entity            = new PushSubscriptionEntity();
        $entity->auth_key  = 'some-auth-key';
        $this->assertSame('some-auth-key', $entity->auth_key);
    }

    // --- Dates list ---

    public function testCreatedAtIsInDatesList(): void
    {
        $entity     = new PushSubscriptionEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('created_at', $prop->getValue($entity));
    }

    public function testUpdatedAtIsInDatesList(): void
    {
        $entity     = new PushSubscriptionEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('updated_at', $prop->getValue($entity));
    }
}
