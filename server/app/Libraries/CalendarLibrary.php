<?php

namespace App\Libraries;

use CodeIgniter\I18n\Time;

/**
 * Builds an RFC 5545 (iCalendar) VEVENT for a stargazing event — the
 * server-side counterpart of `client/utils/calendar.ts`'s `buildEventIcs()`,
 * used to attach an .ics file to the ticket confirmation email. Kept in
 * lockstep with the frontend one: same fields, same 3-hour reminder default,
 * same "Яндекс Карты: <link>" line in DESCRIPTION, same URL property.
 */
class CalendarLibrary
{
    private const DEFAULT_DURATION_HOURS = 3;
    private const DEFAULT_REMINDER_HOURS_BEFORE = 3;
    private const LINE_BREAK = "\r\n";

    /**
     * @param array{
     *     uid: string,
     *     title: string,
     *     start: string,
     *     end?: ?string,
     *     location?: ?string,
     *     address?: ?string,
     *     latitude?: ?float,
     *     longitude?: ?float,
     *     pageUrl?: ?string,
     *     reminderHoursBefore?: ?int,
     * } $params start/end are UTC datetime strings, as stored in the DB.
     */
    public function buildEventIcs(array $params): string
    {
        $start = Time::parse($params['start'], 'UTC');
        $end   = !empty($params['end'])
            ? Time::parse($params['end'], 'UTC')
            : $start->addHours(self::DEFAULT_DURATION_HOURS);

        $locationLine = trim(implode(', ', array_filter([$params['location'] ?? '', $params['address'] ?? ''])));

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//astro.miksoft.pro//stargazing//RU',
            'BEGIN:VEVENT',
            'UID:' . $params['uid'] . '@astro.miksoft.pro',
            'DTSTAMP:' . $this->toIcsUtcDate(Time::now('UTC')),
            'DTSTART:' . $this->toIcsUtcDate($start),
            'DTEND:' . $this->toIcsUtcDate($end),
            'SUMMARY:' . $this->escapeText($params['title']),
        ];

        if ($locationLine !== '') {
            $lines[] = 'LOCATION:' . $this->escapeText($locationLine);
        }

        $latitude  = $params['latitude']  ?? null;
        $longitude = $params['longitude'] ?? null;

        // GEO is the RFC-standard way to attach coordinates (§3.8.1.6) —
        // separate from LOCATION, which stays human-readable text.
        if ($latitude !== null && $longitude !== null) {
            $lines[] = 'GEO:' . $latitude . ';' . $longitude;
            $lines[] = 'DESCRIPTION:' . $this->escapeText('Яндекс Карты: ' . $this->yandexMapLink($latitude, $longitude));
        }

        // URL (§3.8.4.6, URI value type — no TEXT escaping) is what calendar
        // apps like macOS Calendar render as a clickable "URL" field.
        if (!empty($params['pageUrl'])) {
            $lines[] = 'URL:' . $params['pageUrl'];
        }

        $reminderHoursBefore = $params['reminderHoursBefore'] ?? self::DEFAULT_REMINDER_HOURS_BEFORE;

        $lines[] = 'BEGIN:VALARM';
        $lines[] = 'ACTION:DISPLAY';
        $lines[] = 'DESCRIPTION:Напоминание об астровыезде';
        $lines[] = 'TRIGGER:-PT' . $reminderHoursBefore . 'H';
        $lines[] = 'END:VALARM';

        $lines[] = 'END:VEVENT';
        $lines[] = 'END:VCALENDAR';

        return implode(self::LINE_BREAK, $lines);
    }

    private function toIcsUtcDate(Time $time): string
    {
        return $time->format('Ymd\THis\Z');
    }

    /**
     * Escapes TEXT-type values per RFC 5545 §3.3.11 (backslash, semicolon, comma, newline).
     */
    private function escapeText(string $value): string
    {
        return str_replace(['\\', ';', ',', "\n"], ['\\\\', '\\;', '\\,', '\\n'], $value);
    }

    /**
     * Mirrors `client/utils/maps.ts`'s `getYandexMapLink()`.
     */
    private function yandexMapLink(float $latitude, float $longitude): string
    {
        return sprintf('https://yandex.ru/maps/?pt=%s,%s&z=16&l=map', $longitude, $latitude);
    }
}
