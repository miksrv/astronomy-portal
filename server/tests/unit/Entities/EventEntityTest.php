<?php

use App\Entities\EventEntity;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class EventEntityTest extends CIUnitTestCase
{
    // --- Default attribute values ---

    public function testAllAttributesDefaultToNull(): void
    {
        $entity = new EventEntity();
        $this->assertNull($entity->id);
        $this->assertNull($entity->title_en);
        $this->assertNull($entity->title_ru);
        $this->assertNull($entity->yandex_map_link);
        $this->assertNull($entity->google_map_link);
        $this->assertNull($entity->cover_file_name);
        $this->assertNull($entity->cover_file_ext);
    }

    // --- Datamap aliases ---
    // CI4 Entity's toArray() returns the datamap aliases as keys (not DB column names).
    // Accessing the aliased property getter reads through to the underlying DB column.

    public function testYandexMapDatamapAlias(): void
    {
        $entity            = new EventEntity();
        $entity->yandexMap = 'https://yandex.ru/maps/link';
        // Reading back via the underlying DB column name works via magic getter
        $this->assertSame('https://yandex.ru/maps/link', $entity->yandex_map_link);
    }

    public function testGoogleMapDatamapAlias(): void
    {
        $entity            = new EventEntity();
        $entity->googleMap = 'https://maps.google.com/link';
        $this->assertSame('https://maps.google.com/link', $entity->google_map_link);
    }

    public function testCoverFileNameDatamapAlias(): void
    {
        $entity                = new EventEntity();
        $entity->coverFileName = 'cover';
        $this->assertSame('cover', $entity->cover_file_name);
    }

    public function testCoverFileExtDatamapAlias(): void
    {
        $entity               = new EventEntity();
        $entity->coverFileExt = 'jpg';
        $this->assertSame('jpg', $entity->cover_file_ext);
    }

    public function testRegistrationStartDatamapAlias(): void
    {
        $entity                    = new EventEntity();
        $entity->registrationStart = '2025-01-01 10:00:00';
        // The alias writes through to registration_start; reading via alias works
        $this->assertNotNull($entity->registrationStart);
    }

    public function testRegistrationEndDatamapAlias(): void
    {
        $entity                  = new EventEntity();
        $entity->registrationEnd = '2025-01-02 10:00:00';
        $this->assertNotNull($entity->registrationEnd);
    }

    public function testAvailableTicketsDatamapAlias(): void
    {
        $entity                   = new EventEntity();
        $entity->availableTickets = '10';
        // max_tickets is cast to int; alias writes to max_tickets
        $this->assertSame(10, $entity->max_tickets);
    }

    // --- Cast behavior ---

    public function testMaxTicketsCastToInt(): void
    {
        $entity              = new EventEntity();
        $entity->max_tickets = '20';
        $this->assertSame(20, $entity->max_tickets);
        $this->assertIsInt($entity->max_tickets);
    }

    public function testViewsCastToInt(): void
    {
        $entity        = new EventEntity();
        $entity->views = '5';
        $this->assertSame(5, $entity->views);
        $this->assertIsInt($entity->views);
    }
}
