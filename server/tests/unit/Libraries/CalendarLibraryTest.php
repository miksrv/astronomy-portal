<?php

use App\Libraries\CalendarLibrary;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Mirrors `client/utils/calendar.test.ts` — verifies the server-side .ics
 * builder (used for the ticket email attachment) stays in lockstep with the
 * client-side "Add to calendar" button.
 *
 * @internal
 */
final class CalendarLibraryTest extends CIUnitTestCase
{
    public function testBuildsVEventWithStartEndSummary(): void
    {
        $ics = (new CalendarLibrary())->buildEventIcs([
            'uid'   => 'abc123',
            'title' => 'Астровыезд у Экодеревни',
            'start' => '2026-07-12 15:00:00',
            'end'   => '2026-07-12 18:00:00',
        ]);

        $this->assertStringContainsString('BEGIN:VCALENDAR', $ics);
        $this->assertStringContainsString('BEGIN:VEVENT', $ics);
        $this->assertStringContainsString('UID:abc123@astro.miksoft.pro', $ics);
        $this->assertStringContainsString('DTSTART:20260712T150000Z', $ics);
        $this->assertStringContainsString('DTEND:20260712T180000Z', $ics);
        $this->assertStringContainsString('SUMMARY:Астровыезд у Экодеревни', $ics);
        $this->assertStringContainsString('END:VEVENT', $ics);
        $this->assertStringContainsString('END:VCALENDAR', $ics);
    }

    public function testFallsBackToThreeHourDurationWhenEndIsMissing(): void
    {
        $ics = (new CalendarLibrary())->buildEventIcs([
            'uid'   => 'abc123',
            'title' => 'Астровыезд',
            'start' => '2026-07-12 15:00:00',
        ]);

        $this->assertStringContainsString('DTSTART:20260712T150000Z', $ics);
        $this->assertStringContainsString('DTEND:20260712T180000Z', $ics);
    }

    public function testJoinsLocationAndAddressAndEscapesReservedCharacters(): void
    {
        $ics = (new CalendarLibrary())->buildEventIcs([
            'uid'      => 'abc123',
            'title'    => 'Test; Event, Name',
            'start'    => '2026-07-12 15:00:00',
            'location' => 'Экодеревня',
            'address'  => 'с. Гуторово, 1',
        ]);

        $this->assertStringContainsString('LOCATION:Экодеревня\\, с. Гуторово\\, 1', $ics);
        $this->assertStringContainsString('SUMMARY:Test\\; Event\\, Name', $ics);
    }

    public function testOmitsLocationLineWhenNeitherLocationNorAddressIsProvided(): void
    {
        $ics = (new CalendarLibrary())->buildEventIcs([
            'uid'   => 'abc123',
            'title' => 'Test',
            'start' => '2026-07-12 15:00:00',
        ]);

        $this->assertStringNotContainsString('LOCATION:', $ics);
    }

    public function testAddsGeoLineWhenCoordinatesAreProvided(): void
    {
        $ics = (new CalendarLibrary())->buildEventIcs([
            'uid'       => 'abc123',
            'title'     => 'Test',
            'start'     => '2026-07-12 15:00:00',
            'latitude'  => 51.8250225,
            'longitude' => 55.71072,
        ]);

        $this->assertStringContainsString('GEO:51.8250225;55.71072', $ics);
    }

    public function testAddsLabeledYandexMapsLinkToDescriptionWhenCoordinatesAreProvided(): void
    {
        $ics = (new CalendarLibrary())->buildEventIcs([
            'uid'       => 'abc123',
            'title'     => 'Test',
            'start'     => '2026-07-12 15:00:00',
            'latitude'  => 51.8250225,
            'longitude' => 55.71072,
        ]);

        $this->assertStringContainsString(
            'DESCRIPTION:Яндекс Карты: https://yandex.ru/maps/?pt=55.71072\\,51.8250225&z=16&l=map',
            $ics
        );
    }

    public function testSetsUrlToThePageLinkWhenProvided(): void
    {
        $ics = (new CalendarLibrary())->buildEventIcs([
            'uid'     => 'abc123',
            'title'   => 'Test',
            'start'   => '2026-07-12 15:00:00',
            'pageUrl' => 'https://astro.miksoft.pro/stargazing/abc123',
        ]);

        $this->assertStringContainsString('URL:https://astro.miksoft.pro/stargazing/abc123', $ics);
    }

    public function testOmitsUrlWhenNoPageLinkIsProvided(): void
    {
        $ics = (new CalendarLibrary())->buildEventIcs([
            'uid'   => 'abc123',
            'title' => 'Test',
            'start' => '2026-07-12 15:00:00',
        ]);

        $this->assertDoesNotMatchRegularExpression('/^URL:/m', $ics);
    }

    public function testDefaultsReminderToThreeHoursBeforeTheStart(): void
    {
        $ics = (new CalendarLibrary())->buildEventIcs([
            'uid'   => 'abc123',
            'title' => 'Test',
            'start' => '2026-07-12 15:00:00',
        ]);

        $this->assertStringContainsString('BEGIN:VALARM', $ics);
        $this->assertStringContainsString('TRIGGER:-PT3H', $ics);
        $this->assertStringContainsString('END:VALARM', $ics);
    }

    public function testAllowsOverridingTheReminderLeadTime(): void
    {
        $ics = (new CalendarLibrary())->buildEventIcs([
            'uid'                 => 'abc123',
            'title'               => 'Test',
            'start'               => '2026-07-12 15:00:00',
            'reminderHoursBefore' => 1,
        ]);

        $this->assertStringContainsString('TRIGGER:-PT1H', $ics);
    }
}
