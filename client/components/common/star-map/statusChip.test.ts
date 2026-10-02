import { formatGeopos, formatLocalClock, formatLocalDate, formatLocalDateTime } from './statusChip'

const LETTERS = { n: 'N', s: 'S', e: 'E', w: 'W' }
const RU_LETTERS = { n: 'С', s: 'Ю', e: 'В', w: 'З' }

describe('star-map status chip formatters', () => {
    describe('formatGeopos', () => {
        it('formats a north-east position with two decimals', () => {
            expect(formatGeopos([51.82, 55.17], LETTERS)).toBe('51.82° N, 55.17° E')
        })

        it('uses south/west letters for negative coordinates and drops the sign', () => {
            expect(formatGeopos([-33.8688, -151.2093], LETTERS)).toBe('33.87° S, 151.21° W')
        })

        it('treats zero as north/east', () => {
            expect(formatGeopos([0, 0], LETTERS)).toBe('0.00° N, 0.00° E')
        })

        it('accepts localized hemisphere letters', () => {
            expect(formatGeopos([51.82, 55.17], RU_LETTERS)).toBe('51.82° С, 55.17° В')
        })
    })

    describe('local time formatters', () => {
        const instant = new Date('2026-09-01T18:00:00Z')

        it('formats the clock in the place timezone from a plain offset', () => {
            expect(formatLocalClock(instant, { utcOffset: 5 })).toBe('23:00')
        })

        it('formats the clock via the IANA zone name when present', () => {
            expect(formatLocalClock(instant, { zoneName: 'Asia/Yekaterinburg', utcOffset: 6 })).toBe('23:00')
        })

        it('formats date and time as DD.MM.YYYY HH:mm', () => {
            expect(formatLocalDateTime(instant, { utcOffset: 5 })).toBe('01.09.2026 23:00')
        })

        it('rolls the date over when the offset crosses midnight', () => {
            expect(formatLocalDateTime(instant, { utcOffset: 10 })).toBe('02.09.2026 04:00')
        })

        it('zero-pads single-digit hours and minutes', () => {
            expect(formatLocalClock(new Date('2026-03-05T04:07:00Z'), { utcOffset: 0 })).toBe('04:07')
        })

        it('formats the date part alone', () => {
            expect(formatLocalDate(instant, { utcOffset: 5 })).toBe('01.09.2026')
        })
    })
})
