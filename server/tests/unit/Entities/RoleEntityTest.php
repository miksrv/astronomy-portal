<?php

use App\Entities\RoleEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class RoleEntityTest extends CIUnitTestCase
{
    public function testNewInstanceDefaultNameIsEmpty(): void
    {
        $entity = new RoleEntity();
        // 'name' is cast to 'string'; CI4 Entity converts a null attribute to '' on get.
        $this->assertEmpty($entity->name);
    }

    public function testNewInstanceDefaultPermissionsIsNull(): void
    {
        $entity = new RoleEntity();
        $this->assertNull($entity->permissions);
    }

    public function testSettingNameStoresCorrectly(): void
    {
        $entity       = new RoleEntity();
        $entity->name = 'Модератор';
        $this->assertSame('Модератор', $entity->name);
    }

    public function testSettingPermissionsStoresCorrectly(): void
    {
        $entity             = new RoleEntity();
        $entity->permissions = ['events.create', 'events.update'];
        $this->assertSame(['events.create', 'events.update'], $entity->permissions);
    }

    public function testIdIsCastToInt(): void
    {
        $entity     = new RoleEntity();
        $entity->id = '3';
        $this->assertSame(3, $entity->id);
    }
}
