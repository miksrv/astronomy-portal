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

    // --- Photographer / taken_at (grouping + EXIF sort feature) ---

    public function testPhotographerDatamapAlias(): void
    {
        $entity               = new EventPhotoEntity();
        $entity->photographer = 'Иван Иванов';
        $this->assertSame('Иван Иванов', $entity->photographer_name);
    }

    public function testTakenAtDatamapAlias(): void
    {
        $entity          = new EventPhotoEntity();
        $entity->takenAt = '2026-06-01 22:15:00';
        $this->assertSame('2026-06-01 22:15:00', $entity->taken_at);
    }

    /**
     * `taken_at` must stay a plain string on output, not the {date,
     * timezone_type, timezone} object shape produced when a field is listed
     * in $dates (as deleted_at/created_at/updated_at are) — the frontend's
     * `EventPhoto.takenAt` is typed as a plain string, not the shared
     * `DateTime` wire type used by every other entity datetime field.
     */
    public function testTakenAtIsNotInDatesList(): void
    {
        $entity     = new EventPhotoEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertNotContains('taken_at', $prop->getValue($entity));
    }

    public function testTakenAtRemainsStringNotTimeObject(): void
    {
        $entity            = new EventPhotoEntity();
        $entity->taken_at = '2026-06-01 22:15:00';
        $this->assertIsString($entity->taken_at);
        $this->assertSame('2026-06-01 22:15:00', $entity->taken_at);
    }

    public function testTakenAtDefaultsToNull(): void
    {
        $entity = new EventPhotoEntity();
        $this->assertNull($entity->taken_at);
    }
}
