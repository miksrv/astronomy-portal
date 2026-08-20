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
        $this->assertNull($entity->location);
        $this->assertNull($entity->address);
        $this->assertNull($entity->latitude);
        $this->assertNull($entity->longitude);
        $this->assertNull($entity->min_age);
        $this->assertNull($entity->cover_file_name);
        $this->assertNull($entity->cover_file_ext);
    }

    // --- Datamap aliases ---
    // CI4 Entity's toArray() returns the datamap aliases as keys (not DB column names).
    // Accessing the aliased property getter reads through to the underlying DB column.

    public function testMinAgeDatamapAlias(): void
    {
        $entity          = new EventEntity();
        $entity->minAge  = '6';
        $this->assertSame(6, $entity->min_age);
    }

    public function testEndDateDatamapAlias(): void
    {
        $entity          = new EventEntity();
        $entity->endDate = '2025-01-01 10:00:00';
        $this->assertNotNull($entity->endDate);
    }

    public function testLatitudeLongitudeCastToFloat(): void
    {
        $entity            = new EventEntity();
        $entity->latitude  = '51.8250225';
        $entity->longitude = '55.7107200';
        $this->assertIsFloat($entity->latitude);
        $this->assertIsFloat($entity->longitude);
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

    // --- Timezone handling ---
    // Regression tests for the 2026-08-19 production incident: registration
    // closed ~5 hours early because a misconfigured non-UTC app.appTimezone
    // caused the ambient PHP default timezone to drift away from UTC. `date`,
    // `end_date`, `registration_start` and `registration_end` are always
    // stored in the DB as true UTC instants (see Events::parseOrenburgDateTime()),
    // but CI4's built-in 'datetime' cast (DatetimeCast::get()) has no way to
    // pin a timezone per-field — it always parses raw strings using whatever
    // date_default_timezone_get() currently returns. That default must
    // therefore be UTC (app.appTimezone) for these fields to round-trip to
    // the correct instant; if it drifts, a value that is actually already UTC
    // gets silently reinterpreted in the wrong zone.

    public function testRegistrationEndCastPreservesUtcInstantWhenAmbientTimezoneIsUtc(): void
    {
        $this->assertSame(
            'UTC',
            date_default_timezone_get(),
            'The test suite must run with the ambient PHP timezone pinned to UTC ' .
            '(see phpunit.xml.dist app.appTimezone) — otherwise this test cannot ' .
            'actually exercise the invariant it is guarding.'
        );

        $entity = new EventEntity();
        // 21:30 Orenburg (UTC+5) on 2026-08-19, already converted to UTC on write.
        $entity->registration_end = '2026-08-19 16:30:00';

        $this->assertSame('2026-08-19 16:30:00', $entity->registration_end->toDateTimeString());
        $this->assertSame(
            (new \CodeIgniter\I18n\Time('2026-08-19 16:30:00', 'UTC'))->getTimestamp(),
            $entity->registration_end->getTimestamp(),
            'A registration_end value that is already a UTC instant must not be ' .
            'shifted by the cast — this is exactly what broke in production.'
        );
    }

    public function testDateAndEndDateCastPreserveUtcInstant(): void
    {
        $entity            = new EventEntity();
        $entity->date      = '2026-08-19 12:00:00';
        $entity->endDate   = '2026-08-19 18:00:00';

        $this->assertSame(
            (new \CodeIgniter\I18n\Time('2026-08-19 12:00:00', 'UTC'))->getTimestamp(),
            $entity->date->getTimestamp()
        );
        $this->assertSame(
            (new \CodeIgniter\I18n\Time('2026-08-19 18:00:00', 'UTC'))->getTimestamp(),
            $entity->endDate->getTimestamp()
        );
    }
}
