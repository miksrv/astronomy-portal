<?php

use App\Entities\EventUserEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class EventUserEntityTest extends CIUnitTestCase
{
    // --- Cast behavior ---

    public function testAdultsCastToInteger(): void
    {
        $entity         = new EventUserEntity();
        $entity->adults = '3';
        $this->assertSame(3, $entity->adults);
        $this->assertIsInt($entity->adults);
    }

    public function testChildrenCastToInteger(): void
    {
        $entity           = new EventUserEntity();
        $entity->children = '2';
        $this->assertSame(2, $entity->children);
        $this->assertIsInt($entity->children);
    }

    public function testChildrenAgesCastToJsonArray(): void
    {
        $entity = new EventUserEntity();
        // CI4's 'json' cast decodes on read only when the value comes in as a raw DB string.
        // Use injectRawData() to simulate data arriving from the database.
        $entity->injectRawData(['children_ages' => '[5, 8]']);
        $this->assertIsArray($entity->children_ages);
        $this->assertSame([5, 8], $entity->children_ages);
    }

    // --- Date fields ---

    public function testCheckinAtIsInDatesList(): void
    {
        $entity = new EventUserEntity();
        // The dates property is protected; verify via reflection
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $dates = $prop->getValue($entity);
        $this->assertContains('checkin_at', $dates);
    }

    public function testCreatedAtIsInDatesList(): void
    {
        $entity     = new EventUserEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $dates = $prop->getValue($entity);
        $this->assertContains('created_at', $dates);
    }

    // --- Empty datamap ---

    public function testDatamapIsEmpty(): void
    {
        $entity     = new EventUserEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('datamap');
        $prop->setAccessible(true);
        $this->assertSame([], $prop->getValue($entity));
    }
}
