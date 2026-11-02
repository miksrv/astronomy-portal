import { TFunction } from 'i18next'

import {
    formatCalendarDate,
    formatDateFromUnixUTC,
    formatDateRange,
    formatExposure,
    formatYearMonth,
    getHumanTimeFromSec,
    getLocalizedTimeFromSec,
    getSecondsUntilUTCDate
} from './dates'

const mockT: TFunction = ((key: string, defaultValue: string, options?: { count?: number }) =>
    defaultValue?.replace('{{count}}', String(options?.count ?? ''))) as unknown as TFunction

// Fills every {{name}} placeholder, for keys with named values instead of a count
const interpolateT: TFunction = ((key: string, defaultValue: string, options?: Record<string, unknown>) =>
    defaultValue.replace(/{{(\w+)}}/g, (_, name: string) => String(options?.[name] ?? ''))) as unknown as TFunction

describe('dates', () => {
    describe('formatCalendarDate', () => {
        it('formats a night in the given language, without the trailing "г."', () => {
            expect(formatCalendarDate('2023-10-19', 'ru')).toBe('19 окт. 2023')
            expect(formatCalendarDate('2023-10-19', 'en')).toBe('19 Oct 2023')
            expect(formatCalendarDate(undefined, 'ru')).toBe('')
        })
    })

    describe('formatDateRange', () => {
        it('keeps the range short and without the year', () => {
            expect(formatDateRange('2024-05-24', '2024-05-31', 'ru')).toBe('24–31 мая')
            expect(formatDateRange('2024-05-24', '2024-06-03', 'ru')).toBe('24 мая — 3 июн.')
            expect(formatDateRange('2023-12-30', '2024-01-02', 'en')).toBe('30 Dec — 2 Jan')
            expect(formatDateRange('2024-05-24', '2024-05-24', 'ru')).toBe('24 мая')
        })
    })

    describe('formatExposure', () => {
        it('is empty for no exposure', () => {
            expect(formatExposure(0, interpolateT)).toBe('')
            expect(formatExposure(undefined, interpolateT)).toBe('')
        })

        it('shows minutes under an hour, at least one', () => {
            expect(formatExposure(20, interpolateT)).toBe('1 мин')
            expect(formatExposure(1500, interpolateT)).toBe('25 мин')
        })

        it('shows hours and minutes', () => {
            expect(formatExposure(69300, interpolateT)).toBe('19 ч 15 мин')
            expect(formatExposure(7200, interpolateT)).toBe('2 ч')
            expect(formatExposure(7199, interpolateT)).toBe('2 ч')
        })
    })

    describe('getLocalizedTimeFromSec', () => {
        it('returns "0" for 0 seconds', () => {
            expect(getLocalizedTimeFromSec(0, false, mockT)).toBe('0')
        })

        it('returns "0" for negative values', () => {
            expect(getLocalizedTimeFromSec(-100, false, mockT)).toBe('0')
        })

        it('formats 1 hour 30 minutes 45 seconds as HH:MM:SS', () => {
            expect(getLocalizedTimeFromSec(5445, false, mockT)).toBe('01:30:45')
        })

        it('formats exactly 1 minute as "00:01:00"', () => {
            expect(getLocalizedTimeFromSec(60, false, mockT)).toBe('00:01:00')
        })

        it('formats sub-minute seconds as "00:00:30"', () => {
            expect(getLocalizedTimeFromSec(30, false, mockT)).toBe('00:00:30')
        })

        it('formats exactly 1 hour as "01:00:00"', () => {
            expect(getLocalizedTimeFromSec(3600, false, mockT)).toBe('01:00:00')
        })

        it('returns only seconds part in full mode when less than a minute', () => {
            const result = getLocalizedTimeFromSec(45, true, mockT)
            expect(result).toBe('45 секунда')
        })

        it('formats 90 seconds in full mode showing minutes only', () => {
            const result = getLocalizedTimeFromSec(90, true, mockT)
            expect(result).toBe('1 минута')
        })

        it('formats 1 day 2 hours 3 minutes in full mode', () => {
            const sec = 86400 + 7380
            const result = getLocalizedTimeFromSec(sec, true, mockT)
            expect(result).toBe('1 день 2 час 3 минута')
        })

        it('omits seconds in full mode when larger units exist', () => {
            const result = getLocalizedTimeFromSec(3661, true, mockT)
            expect(result).toContain('час')
            expect(result).toContain('минута')
            expect(result).not.toContain('секунда')
        })
    })

    describe('getHumanTimeFromSec', () => {
        it('shows minutes and seconds for a short span', () => {
            // 17 * 60 + 49 = 1069
            expect(getHumanTimeFromSec(1069, mockT)).toBe('17 минута 49 секунда')
        })

        it('shows only seconds below a minute', () => {
            expect(getHumanTimeFromSec(45, mockT)).toBe('45 секунда')
        })

        it('renders zero as "0 seconds"', () => {
            expect(getHumanTimeFromSec(0, mockT)).toBe('0 секунда')
            expect(getHumanTimeFromSec(-10, mockT)).toBe('0 секунда')
        })

        it('omits seconds once an hour or more remains', () => {
            const result = getHumanTimeFromSec(3661, mockT)
            expect(result).toBe('1 час 1 минута')
            expect(result).not.toContain('секунда')
        })
    })

    describe('getSecondsUntilUTCDate', () => {
        it('returns undefined for undefined input', () => {
            expect(getSecondsUntilUTCDate(undefined)).toBeUndefined()
        })

        it('returns a positive number for a future date', () => {
            const future = new Date(Date.now() + 60000).toISOString()
            const result = getSecondsUntilUTCDate(future)
            expect(typeof result).toBe('number')
            expect(result!).toBeGreaterThan(0)
        })

        it('returns a negative number for a past date', () => {
            const past = new Date(Date.now() - 60000).toISOString()
            const result = getSecondsUntilUTCDate(past)
            expect(typeof result).toBe('number')
            expect(result!).toBeLessThan(0)
        })

        it('returns approximately 0 for the current time', () => {
            const now = new Date().toISOString()
            const result = getSecondsUntilUTCDate(now)
            expect(typeof result).toBe('number')
            expect(Math.abs(result!)).toBeLessThan(5)
        })
    })

    describe('formatDateFromUnixUTC', () => {
        it('returns empty string for undefined', () => {
            expect(formatDateFromUnixUTC(undefined)).toBe('')
        })

        it('returns empty string for 0', () => {
            expect(formatDateFromUnixUTC(0)).toBe('')
        })

        it('formats a known unix timestamp in milliseconds', () => {
            const timestampMs = 1700000000000
            const result = formatDateFromUnixUTC(timestampMs)
            expect(typeof result).toBe('string')
            expect(result.length).toBeGreaterThan(0)
        })

        it('accepts a custom format string', () => {
            const timestampMs = 1700000000000
            const result = formatDateFromUnixUTC(timestampMs, 'YYYY')
            expect(result).toMatch(/^\d{4}$/)
        })
    })

    describe('formatYearMonth', () => {
        it('formats date in Russian with capitalized month', () => {
            expect(formatYearMonth('2019-07', 'ru')).toBe('Июль 2019')
        })

        it('formats date in English', () => {
            expect(formatYearMonth('2022-03', 'en')).toBe('March 2022')
        })

        it('formats January correctly in Russian', () => {
            expect(formatYearMonth('2020-01', 'ru')).toBe('Январь 2020')
        })

        it('formats December correctly in Russian', () => {
            expect(formatYearMonth('2023-12', 'ru')).toBe('Декабрь 2023')
        })
    })
})
