<?php

use App\Entities\UserEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class UserEntityTest extends CIUnitTestCase
{
    // --- Default attribute values ---

    public function testNewInstanceDefaultRoleIsUser(): void
    {
        $entity = new UserEntity();
        $this->assertSame('user', $entity->role);
    }

    public function testNewInstanceDefaultAuthTypeIsNative(): void
    {
        $entity = new UserEntity();
        $this->assertSame('native', $entity->auth_type);
    }

    public function testNewInstanceDefaultLocaleIsRu(): void
    {
        $entity = new UserEntity();
        $this->assertSame('ru', $entity->locale);
    }

    public function testNewInstanceDefaultIdIsEmpty(): void
    {
        $entity = new UserEntity();
        // 'id' is cast to 'string'; CI4 Entity converts null attribute to '' on get
        $this->assertEmpty($entity->id);
    }

    public function testNewInstanceDefaultNameIsEmpty(): void
    {
        $entity = new UserEntity();
        // 'name' is cast to 'string'; CI4 Entity converts null attribute to '' on get
        $this->assertEmpty($entity->name);
    }

    public function testNewInstanceDefaultEmailIsEmpty(): void
    {
        $entity = new UserEntity();
        // 'email' is cast to 'string'; CI4 Entity converts null attribute to '' on get
        $this->assertEmpty($entity->email);
    }

    public function testNewInstanceDefaultAvatarIsNull(): void
    {
        $entity = new UserEntity();
        // 'avatar' is cast to '?string'; nullable cast preserves null
        $this->assertNull($entity->avatar);
    }

    // --- Attribute assignment ---

    public function testSettingNameStoresCorrectly(): void
    {
        $entity       = new UserEntity();
        $entity->name = 'Alice';
        $this->assertSame('Alice', $entity->name);
    }

    public function testSettingRoleStoresCorrectly(): void
    {
        $entity       = new UserEntity();
        $entity->role = 'admin';
        $this->assertSame('admin', $entity->role);
    }
}
