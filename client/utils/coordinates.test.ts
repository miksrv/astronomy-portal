import { formatDEC, formatRA } from './coordinates'

describe('coordinates', () => {
    describe('formatRA', () => {
        it('formats 0 degrees as "0h 0m 0.00s"', () => {
            expect(formatRA(0)).toBe('0h 0m 0.00s')
        })

        it('formats 15 degrees as "1h 0m 0.00s"', () => {
            expect(formatRA(15)).toBe('1h 0m 0.00s')
        })

        it('formats 23.4375 degrees correctly', () => {
            expect(formatRA(23.4375)).toBe('1h 33m 45.00s')
        })

        it('returns empty string for undefined', () => {
            expect(formatRA(undefined)).toBe('')
        })

        it('returns empty string for null', () => {
            // @ts-expect-error: testing null input
            expect(formatRA(null)).toBe('')
        })
    })

    describe('coordinates', () => {
        describe('formatDEC', () => {
            it('formats 0 degrees as "+0° 0′ 0.00″"', () => {
                expect(formatDEC(0)).toBe('+0° 0′ 0.00″')
            })

            it('formats positive declination', () => {
                expect(formatDEC(12.3456)).toBe('+12° 20′ 44.16″')
            })

            it('formats negative declination', () => {
                expect(formatDEC(-5.6789)).toBe('-5° 40′ 44.04″')
            })

            it('returns empty string for undefined', () => {
                expect(formatDEC(undefined)).toBe('')
            })

            it('returns empty string for null', () => {
                // @ts-expect-error: testing null input
                expect(formatDEC(null)).toBe('')
            })

            it('returns empty string for NaN', () => {
                expect(formatDEC(NaN)).toBe('')
            })
        })
    })
})
