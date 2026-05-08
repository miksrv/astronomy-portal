<?php

use App\Entities\ObjectFitsFiltersEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class ObjectFitsFiltersEntityTest extends CIUnitTestCase
{
    // --- Cast behavior ---

    public function testFramesCountCastToInteger(): void
    {
        $entity               = new ObjectFitsFiltersEntity();
        $entity->frames_count = '42';
        $this->assertSame(42, $entity->frames_count);
        $this->assertIsInt($entity->frames_count);
    }

    public function testExposureTimeCastToFloat(): void
    {
        $entity                = new ObjectFitsFiltersEntity();
        $entity->exposure_time = '300.5';
        $this->assertSame(300.5, $entity->exposure_time);
        $this->assertIsFloat($entity->exposure_time);
    }

    public function testFilesSizeCastToFloat(): void
    {
        $entity             = new ObjectFitsFiltersEntity();
        $entity->files_size = '2048.75';
        $this->assertSame(2048.75, $entity->files_size);
        $this->assertIsFloat($entity->files_size);
    }

    public function testObjectNameCastToString(): void
    {
        $entity              = new ObjectFitsFiltersEntity();
        $entity->object_name = 'M42';
        $this->assertSame('M42', $entity->object_name);
        $this->assertIsString($entity->object_name);
    }

    public function testFilterCastToString(): void
    {
        $entity         = new ObjectFitsFiltersEntity();
        $entity->filter = 'luminance';
        $this->assertSame('luminance', $entity->filter);
        $this->assertIsString($entity->filter);
    }

    // --- Default attribute values ---

    public function testNewInstanceNumericAttributesDefaultToZero(): void
    {
        // cast types return zero-values for null: 'integer' → 0, 'float' → 0.0
        $entity = new ObjectFitsFiltersEntity();
        $this->assertSame(0, $entity->frames_count);
        $this->assertSame(0.0, $entity->exposure_time);
        $this->assertSame(0.0, $entity->files_size);
    }
}
