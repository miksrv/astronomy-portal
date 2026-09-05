import { stepDate } from './timeStep'

describe('star-map timeStep', () => {
    const base = new Date('2026-09-01T18:00:00Z')

    describe('hour step', () => {
        it('adds exactly 3600 seconds regardless of the zone', () => {
            expect(stepDate(base, 'hour', 1, null).toISOString()).toBe('2026-09-01T19:00:00.000Z')
            expect(stepDate(base, 'hour', 1, { zoneName: 'Europe/Berlin', utcOffset: 1 }).toISOString()).toBe(
                '2026-09-01T19:00:00.000Z'
            )
        })

        it('subtracts exactly 3600 seconds', () => {
            expect(stepDate(base, 'hour', -1, null).toISOString()).toBe('2026-09-01T17:00:00.000Z')
        })
    })

    describe('day step', () => {
        it('falls back to ±86400 seconds without a resolved zone', () => {
            expect(stepDate(base, 'day', 1, null).toISOString()).toBe('2026-09-02T18:00:00.000Z')
            expect(stepDate(base, 'day', -1, null).toISOString()).toBe('2026-08-31T18:00:00.000Z')
        })

        it('keeps the wall-clock time in a zone without DST', () => {
            // 23:00 local (UTC+5) on 1 Sep → 23:00 local on 2 Sep
            const orenburg = { zoneName: 'Asia/Yekaterinburg', utcOffset: 5 }

            expect(stepDate(base, 'day', 1, orenburg).toISOString()).toBe('2026-09-02T18:00:00.000Z')
            expect(stepDate(base, 'day', -1, orenburg).toISOString()).toBe('2026-08-31T18:00:00.000Z')
        })

        it('keeps the wall-clock time across a DST switch (Europe/Berlin, 29 Mar 2026)', () => {
            const berlin = { zoneName: 'Europe/Berlin', utcOffset: 1 }
            // Saturday 28 Mar 2026 22:00 CET (UTC+1) = 21:00Z; DST starts Sunday 29 Mar 02:00
            const saturday = new Date('2026-03-28T21:00:00Z')

            const sunday = stepDate(saturday, 'day', 1, berlin)

            // Still 22:00 on the wall clock, now CEST (UTC+2) → 20:00Z, not 21:00Z
            expect(sunday.toISOString()).toBe('2026-03-29T20:00:00.000Z')
            // And back again lands on the original instant
            expect(stepDate(sunday, 'day', -1, berlin).toISOString()).toBe(saturday.toISOString())
        })

        it('rolls over month and year boundaries', () => {
            const utc = { utcOffset: 0 }

            expect(stepDate(new Date('2026-12-31T22:00:00Z'), 'day', 1, utc).toISOString()).toBe(
                '2027-01-01T22:00:00.000Z'
            )
            expect(stepDate(new Date('2026-03-01T10:00:00Z'), 'day', -1, utc).toISOString()).toBe(
                '2026-02-28T10:00:00.000Z'
            )
        })
    })
})
