import { formatSecondsToExposure, getTimeFromSec } from './helpers'

describe('helpers', () => {
    describe('formatSecondsToExposure', () => {
        it('returns "0" for 0 seconds', () => {
            expect(formatSecondsToExposure(0)).toBe('0')
        })

        it('returns "0" for negative values', () => {
            expect(formatSecondsToExposure(-60)).toBe('0')
        })

        it('formats sub-minute value as "00:00"', () => {
            expect(formatSecondsToExposure(45)).toBe('00:00')
        })

        it('formats exactly 1 minute as "00:01"', () => {
            expect(formatSecondsToExposure(60)).toBe('00:01')
        })

        it('formats exactly 1 hour as "01:00"', () => {
            expect(formatSecondsToExposure(3600)).toBe('01:00')
        })

        it('formats values greater than 1 hour', () => {
            expect(formatSecondsToExposure(7384)).toBe('02:03')
        })

        it('accepts a string input', () => {
            expect(formatSecondsToExposure('3600')).toBe('01:00')
        })

        it('returns "0" for string "0"', () => {
            expect(formatSecondsToExposure('0')).toBe('0')
        })

        it('formats full mode for 0 seconds returns "0"', () => {
            expect(formatSecondsToExposure(0, true)).toBe('0')
        })

        it('formats sub-minute value in full mode as empty string (no hours or minutes)', () => {
            expect(formatSecondsToExposure(45, true)).toBe('')
        })

        it('formats exactly 1 minute in full mode', () => {
            expect(formatSecondsToExposure(60, true)).toBe('1 минута')
        })

        it('formats exactly 1 hour in full mode', () => {
            expect(formatSecondsToExposure(3600, true)).toBe('1 час ')
        })

        it('formats 2 hours 3 minutes in full mode', () => {
            expect(formatSecondsToExposure(7384, true)).toBe('2 часа 3 минуты')
        })

        it('formats 5 hours in full mode', () => {
            expect(formatSecondsToExposure(18000, true)).toBe('5 часов ')
        })
    })

    describe('getTimeFromSec', () => {
        it('returns "0" for 0 seconds', () => {
            expect(getTimeFromSec(0)).toBe('0')
        })

        it('returns "0" for negative values', () => {
            expect(getTimeFromSec(-1)).toBe('0')
        })

        it('formats sub-minute value as "00:00"', () => {
            expect(getTimeFromSec(30)).toBe('00:00')
        })

        it('formats exactly 1 minute as "00:01"', () => {
            expect(getTimeFromSec(60)).toBe('00:01')
        })

        it('formats exactly 1 hour as "01:00"', () => {
            expect(getTimeFromSec(3600)).toBe('01:00')
        })

        it('formats values greater than 1 hour', () => {
            expect(getTimeFromSec(7384)).toBe('02:03')
        })

        it('delegates to formatSecondsToExposure in full mode', () => {
            expect(getTimeFromSec(7384, true)).toBe(formatSecondsToExposure(7384, true))
        })
    })
})
