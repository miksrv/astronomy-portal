import fs from 'fs'
import path from 'path'

import {
    dateToWallClock,
    decodeTimezonePolygons,
    formatUtcOffset,
    getZoneOffsetMinutes,
    isPointInRing,
    resolveTimeZone,
    TimezonePolygon,
    wallClockToDate
} from './timezone'

const loadRealPolygons = (): TimezonePolygon[] => {
    const raw = fs.readFileSync(path.resolve(__dirname, '../../../public/data/timezones.json'), 'utf-8')
    return decodeTimezonePolygons(JSON.parse(raw))
}

describe('star-map timezone', () => {
    const polygons = loadRealPolygons()

    describe('decodeTimezonePolygons', () => {
        it('decodes the bundled Natural Earth topology into polygons with offsets', () => {
            expect(polygons.length).toBeGreaterThan(100)
            expect(polygons.every((p) => Number.isFinite(p.utcOffset))).toBe(true)
            expect(polygons.every((p) => p.rings.length >= 1)).toBe(true)
        })
    })

    describe('isPointInRing', () => {
        const square: Array<[number, number]> = [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10]
        ]

        it('detects a point inside', () => {
            expect(isPointInRing([5, 5], square)).toBe(true)
        })

        it('detects a point outside', () => {
            expect(isPointInRing([15, 5], square)).toBe(false)
        })
    })

    describe('resolveTimeZone (real polygons)', () => {
        it('resolves Moscow to UTC+3', () => {
            expect(resolveTimeZone(55.75, 37.62, polygons).utcOffset).toBe(3)
        })

        it('resolves Orenburg to UTC+5', () => {
            expect(resolveTimeZone(51.77, 55.1, polygons).utcOffset).toBe(5)
        })

        it('resolves New York with an IANA name and a DST-aware offset', () => {
            const winter = resolveTimeZone(40.71, -74.01, polygons, new Date('2026-01-15T12:00:00Z'))
            const summer = resolveTimeZone(40.71, -74.01, polygons, new Date('2026-07-15T12:00:00Z'))
            expect(winter.utcOffset).toBe(-5)
            expect(summer.utcOffset).toBe(-4)
            expect(winter.zoneName).toBeTruthy()
        })

        it('falls back to the solar approximation in the open ocean', () => {
            expect(resolveTimeZone(-40, -140.5, polygons).utcOffset).toBe(Math.round(-140.5 / 15))
        })
    })

    describe('getZoneOffsetMinutes', () => {
        it('is DST-aware for America/New_York', () => {
            expect(getZoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'), 'America/New_York')).toBe(-300)
            expect(getZoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'), 'America/New_York')).toBe(-240)
        })

        it('returns null for an unknown zone name', () => {
            expect(getZoneOffsetMinutes(new Date(), 'Nowhere/Unknown')).toBeNull()
        })
    })

    describe('wallClockToDate', () => {
        it('converts a Yekaterinburg wall clock (UTC+5) to the right instant', () => {
            const date = wallClockToDate('2026-08-28T21:00', { zoneName: 'Asia/Yekaterinburg', utcOffset: 5 })
            expect(date?.toISOString()).toBe('2026-08-28T16:00:00.000Z')
        })

        it('applies DST for an IANA zone even when the standard offset differs', () => {
            const date = wallClockToDate('2026-07-15T12:00', { zoneName: 'America/New_York', utcOffset: -5 })
            expect(date?.toISOString()).toBe('2026-07-15T16:00:00.000Z')
        })

        it('falls back to the fixed offset without a zone name', () => {
            const date = wallClockToDate('2026-08-28T21:00', { utcOffset: 5 })
            expect(date?.toISOString()).toBe('2026-08-28T16:00:00.000Z')
        })

        it('rejects malformed input', () => {
            expect(wallClockToDate('not-a-date', { utcOffset: 0 })).toBeNull()
        })
    })

    describe('formatUtcOffset', () => {
        it('formats positive and negative offsets', () => {
            expect(formatUtcOffset({ utcOffset: 5 })).toBe('UTC+05:00')
            expect(formatUtcOffset({ utcOffset: -3.5 })).toBe('UTC-03:30')
        })

        it('keeps a legitimate zero Intl offset instead of the stale stored one', () => {
            // Iceland is UTC+0 year-round — a nonzero polygon offset must not win over it
            expect(
                formatUtcOffset({ zoneName: 'Atlantic/Reykjavik', utcOffset: 5 }, new Date('2026-01-15T12:00:00Z'))
            ).toBe('UTC+00:00')
        })
    })

    describe('dateToWallClock', () => {
        it('formats the instant as the zone wall clock', () => {
            expect(
                dateToWallClock(new Date('2026-08-28T16:00:00Z'), { zoneName: 'Asia/Yekaterinburg', utcOffset: 5 })
            ).toBe('2026-08-28T21:00')
        })

        it('keeps a legitimate zero Intl offset instead of the stale stored one', () => {
            expect(
                dateToWallClock(new Date('2026-01-15T12:34:00Z'), { zoneName: 'Atlantic/Reykjavik', utcOffset: 5 })
            ).toBe('2026-01-15T12:34')
        })
    })
})
