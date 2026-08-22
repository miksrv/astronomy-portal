<?php

use App\Entities\EventMediaEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class EventMediaEntityTest extends CIUnitTestCase
{
    // --- Cast behavior ---

    public function testFileSizeCastToInteger(): void
    {
        $entity            = new EventMediaEntity();
        $entity->file_size = '102400';
        $this->assertSame(102400, $entity->file_size);
        $this->assertIsInt($entity->file_size);
    }

    public function testWidthCastToInteger(): void
    {
        $entity        = new EventMediaEntity();
        $entity->width = '1920';
        $this->assertSame(1920, $entity->width);
        $this->assertIsInt($entity->width);
    }

    public function testHeightCastToInteger(): void
    {
        $entity         = new EventMediaEntity();
        $entity->height = '1080';
        $this->assertSame(1080, $entity->height);
        $this->assertIsInt($entity->height);
    }

    // --- Video-specific fields (FEAT-26) ---

    public function testMediaTypeDatamapAlias(): void
    {
        $entity            = new EventMediaEntity();
        $entity->mediaType = 'video';
        $this->assertSame('video', $entity->media_type);
    }

    public function testDurationCastToInteger(): void
    {
        $entity           = new EventMediaEntity();
        $entity->duration = '42';
        $this->assertSame(42, $entity->duration);
        $this->assertIsInt($entity->duration);
    }

    /**
     * `duration` is NULL for every photo row — a plain 'integer' cast would
     * silently turn that into 0, indistinguishable from "a 0-second video".
     */
    public function testDurationRemainsNullForPhotos(): void
    {
        $entity           = new EventMediaEntity();
        $entity->duration = null;
        $this->assertNull($entity->duration);
    }

    public function testDurationDefaultsToNull(): void
    {
        $entity = new EventMediaEntity();
        $this->assertNull($entity->duration);
    }

    // --- Datamap aliases ---

    public function testEventIdDatamapAlias(): void
    {
        $entity          = new EventMediaEntity();
        $entity->eventId = 'evt-abc123';
        $this->assertSame('evt-abc123', $entity->event_id);
    }

    public function testNameDatamapAliasWritesToFileName(): void
    {
        $entity       = new EventMediaEntity();
        $entity->name = 'dsc_0001';
        $this->assertSame('dsc_0001', $entity->file_name);
    }

    public function testExtDatamapAliasWritesToFileExt(): void
    {
        $entity      = new EventMediaEntity();
        $entity->ext = 'jpg';
        $this->assertSame('jpg', $entity->file_ext);
    }

    // --- Dates list ---

    public function testCreatedAtIsInDatesList(): void
    {
        $entity     = new EventMediaEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('created_at', $prop->getValue($entity));
    }

    public function testUpdatedAtIsInDatesList(): void
    {
        $entity     = new EventMediaEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('updated_at', $prop->getValue($entity));
    }

    public function testDeletedAtIsInDatesList(): void
    {
        $entity     = new EventMediaEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertContains('deleted_at', $prop->getValue($entity));
    }

    // --- Photographer / taken_at (grouping + EXIF sort feature) ---

    public function testPhotographerDatamapAlias(): void
    {
        $entity               = new EventMediaEntity();
        $entity->photographer = 'Иван Иванов';
        $this->assertSame('Иван Иванов', $entity->photographer_name);
    }

    public function testTakenAtDatamapAlias(): void
    {
        $entity          = new EventMediaEntity();
        $entity->takenAt = '2026-06-01 22:15:00';
        $this->assertSame('2026-06-01 22:15:00', $entity->taken_at);
    }

    /**
     * `taken_at` must stay a plain string on output, not the {date,
     * timezone_type, timezone} object shape produced when a field is listed
     * in $dates (as deleted_at/created_at/updated_at are) — the frontend's
     * `EventMedia.takenAt` is typed as a plain string, not the shared
     * `DateTime` wire type used by every other entity datetime field.
     */
    public function testTakenAtIsNotInDatesList(): void
    {
        $entity     = new EventMediaEntity();
        $reflection = new ReflectionClass($entity);
        $prop       = $reflection->getProperty('dates');
        $prop->setAccessible(true);
        $this->assertNotContains('taken_at', $prop->getValue($entity));
    }

    public function testTakenAtRemainsStringNotTimeObject(): void
    {
        $entity            = new EventMediaEntity();
        $entity->taken_at = '2026-06-01 22:15:00';
        $this->assertIsString($entity->taken_at);
        $this->assertSame('2026-06-01 22:15:00', $entity->taken_at);
    }

    public function testTakenAtDefaultsToNull(): void
    {
        $entity = new EventMediaEntity();
        $this->assertNull($entity->taken_at);
    }
}
