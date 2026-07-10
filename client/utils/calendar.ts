import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { getYandexMapLink } from '@/utils/maps'

dayjs.extend(utc)

const DEFAULT_DURATION_HOURS = 3
// How long before the event the calendar app should remind the user —
// overrides the app's own default (often 30 minutes), which isn't enough
// lead time to get to the observatory.
const DEFAULT_REMINDER_HOURS_BEFORE = 3
const ICS_LINE_BREAK = '\r\n'

export interface CalendarEventParams {
    /** Unique id for the ICS UID (e.g. the booking id) — not shown to the user. */
    uid: string
    title: string
    /** UTC datetime string, as returned by the API. */
    start: string
    /** UTC datetime string. Falls back to start + 3h when missing. */
    end?: string
    location?: string
    address?: string
    latitude?: number
    longitude?: number
    /** Link to the event page on the site — set as the VEVENT's URL property. */
    pageUrl?: string
    /** Hours before the start to trigger the built-in reminder. Defaults to 3. */
    reminderHoursBefore?: number
}

/**
 * Escapes TEXT-type values per RFC 5545 §3.3.11 (backslash, semicolon, comma, newline).
 */
const escapeIcsText = (value: string): string =>
    value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

const toIcsUtcDate = (value: Dayjs): string => value.format('YYYYMMDD[T]HHmmss[Z]')

/**
 * Builds an RFC 5545 (iCalendar) VEVENT for a single stargazing event, for a
 * client-side "Add to calendar" download — no backend involved.
 */
export const buildEventIcs = (params: CalendarEventParams): string => {
    const start = dayjs.utc(params.start)
    const end = params.end ? dayjs.utc(params.end) : start.add(DEFAULT_DURATION_HOURS, 'hour')

    const locationLine = [params.location, params.address].filter(Boolean).join(', ')

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//astro.miksoft.pro//stargazing//RU',
        'BEGIN:VEVENT',
        `UID:${params.uid}@astro.miksoft.pro`,
        `DTSTAMP:${toIcsUtcDate(dayjs.utc())}`,
        `DTSTART:${toIcsUtcDate(start)}`,
        `DTEND:${toIcsUtcDate(end)}`,
        `SUMMARY:${escapeIcsText(params.title)}`
    ]

    if (locationLine) {
        lines.push(`LOCATION:${escapeIcsText(locationLine)}`)
    }

    // GEO is the RFC-standard way to attach coordinates (RFC 5545 §3.8.1.6) —
    // separate from LOCATION, which stays human-readable text. Calendar apps
    // that support it (Apple/Google) use GEO to place a map pin; raw
    // coordinates dumped into LOCATION itself geocode inconsistently across clients.
    if (params.latitude !== undefined && params.longitude !== undefined) {
        lines.push(`GEO:${params.latitude};${params.longitude}`)
    }

    if (params.latitude !== undefined && params.longitude !== undefined) {
        lines.push(
            `DESCRIPTION:${escapeIcsText(`Яндекс Карты: ${getYandexMapLink(params.latitude, params.longitude)}`)}`
        )
    }

    // URL is a dedicated RFC 5545 property (§3.8.4.6, URI value type — no TEXT
    // escaping) that calendar apps like macOS Calendar render as a clickable
    // "URL" field on the event, separate from DESCRIPTION.
    if (params.pageUrl) {
        lines.push(`URL:${params.pageUrl}`)
    }

    const reminderHoursBefore = params.reminderHoursBefore ?? DEFAULT_REMINDER_HOURS_BEFORE

    lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Напоминание об астровыезде',
        `TRIGGER:-PT${reminderHoursBefore}H`,
        'END:VALARM'
    )

    lines.push('END:VEVENT', 'END:VCALENDAR')

    return lines.join(ICS_LINE_BREAK)
}

/**
 * Triggers a browser download of the given ICS content as a file — the same
 * blob-URL + synthetic `<a download>` pattern used by `EventTicket` for the
 * ticket PNG.
 */
export const downloadIcsFile = (filename: string, content: string): void => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()

    URL.revokeObjectURL(url)
}
