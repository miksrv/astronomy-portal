<?php

use App\Entities\ObjectEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class ObjectEntityTest extends CIUnitTestCase
{
    // --- Default attribute values ---

    public function testNewInstanceRaDefaultsToZero(): void
    {
        // 'ra' cast to 'float'; CI4 Entity converts null attribute to 0.0 on get
        $entity = new ObjectEntity();
        $this->assertSame(0.0, $entity->ra);
    }

    public function testNewInstanceDecDefaultsToZero(): void
    {
        // 'dec' cast to 'float'; CI4 Entity converts null attribute to 0.0 on get
        $entity = new ObjectEntity();
        $this->assertSame(0.0, $entity->dec);
    }

    public function testNewInstanceDeletedAtDefaultsToNull(): void
    {
        $entity = new ObjectEntity();
        $this->assertNull($entity->deleted_at);
    }

    // --- Cast behavior ---

    public function testRaCastToFloat(): void
    {
        $entity     = new ObjectEntity();
        $entity->ra = '83.8221';
        $this->assertSame(83.8221, $entity->ra);
        $this->assertIsFloat($entity->ra);
    }

    public function testDecCastToFloat(): void
    {
        $entity      = new ObjectEntity();
        $entity->dec = '-5.3911';
        $this->assertSame(-5.3911, $entity->dec);
        $this->assertIsFloat($entity->dec);
    }

    public function testRaZeroCastToFloat(): void
    {
        $entity     = new ObjectEntity();
        $entity->ra = '0';
        $this->assertSame(0.0, $entity->ra);
        $this->assertIsFloat($entity->ra);
    }

    // --- Attribute assignment ---

    public function testCatalogNameStoredAsString(): void
    {
        $entity               = new ObjectEntity();
        $entity->catalog_name = 'M31';
        $this->assertSame('M31', $entity->catalog_name);
    }
}
