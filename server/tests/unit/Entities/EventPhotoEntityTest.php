<?php

use App\Entities\EventPhotoEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class EventPhotoEntityTest extends CIUnitTestCase
{
    // --- Cast behavior ---

    public function testFileSizeCastToInteger(): void
    {
        $entity            = new EventPhotoEntity();
        $entity->file_size = '102400';
        $this->assertSame(102400, $entity->file_size);
        $this->assertIsInt($entity->file_size);
    }

    public function testImageWidthCastToInteger(): void
    {
        $entity              = new EventPhotoEntity();
        $entity->image_width = '1920';
        $this->assertSame(1920, $entity->image_width);
        $this->assertIsInt($entity->image_width);
    }

    public function testImageHeightCastToInteger(): void
    {
        $entity               = new EventPhotoEntity();
        $entity->image_height = '1080';
        $this->assertSame(1080, $entity->image_height);
        $this->assertIsInt($entity->image_height);
    }

    // --- Datamap aliases ---

    public function testEventIdDatamapAlias(): void
    {
        $entity          = new EventPhotoEntity();
        $entity->eventId = 'evt-abc123';
        $this->assertSame('evt-abc123', $entity->event_id);
    }

    public function testNameDatamapAliasWritesToFileName(): void
    {
        $entity       = new EventPhotoEntity();
        $entity->name = 'dsc_0001';
        $this->assertSame('dsc_0001', $entity->file_name);
    }

    public function testExtDatamapAliasWritesToFileExt(): void
    {
        $entity      = new EventPhotoEntity();
        $entity->ext = 'jpg';
        $this->assertSame('jpg', $entity->file_ext);
    }

    public function testWidthDatamapAliasAppliesIntCast(): void
    {
        $entity        = new EventPhotoEntity();
        $entity->width = '800';
        $this->assertSame(800, $entity->image_width);
        $this->assertIsInt($entity->image_width);
    }

    public function testHeightDatamapAliasAppliesIntCast(): void
    {
        $entity         = new EventPhotoEntity();
        $entity->height = '600';
        $this->assertSame(600, $entity->image_height);
        $this->assertIsInt($entity->image_height);
    }

    // --- Dates list ---

    public function testCreatedAtIsInDatesList(): void
    {
        $entity     = new EventPhotoEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('created_at', $prop->getValue($entity));
    }

    public function testUpdatedAtIsInDatesList(): void
    {
        $entity     = new EventPhotoEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('updated_at', $prop->getValue($entity));
    }

    public function testDeletedAtIsInDatesList(): void
    {
        $entity     = new EventPhotoEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('deleted_at', $prop->getValue($entity));
    }
}
