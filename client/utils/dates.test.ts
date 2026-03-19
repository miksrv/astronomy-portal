import { TFunction } from 'i18next'

import { formatDateFromUnixUTC, getLocalizedTimeFromSec, getSecondsUntilUTCDate } from './dates'

const mockT: TFunction = ((key: string, defaultValue: string, options?: { count?: number }) =>
    defaultValue?.replace('{{count}}', String(options?.count ?? ''))) as TFunction

describe('dates', () => {
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
})
