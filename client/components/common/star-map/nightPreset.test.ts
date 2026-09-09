import * as Astronomy from 'astronomy-engine'

import { findTonightMoment, sunAltitude } from './nightPreset'

const ORENBURG: [number, number] = [51.82, 55.17]
const MINUTE = 60_000

describe('star-map night preset', () => {
    it('jumps to the end of astronomical twilight the same evening when called by day', () => {
        // Reference computed with astronomy-engine: Sun at −18° on 2026-09-01 at 17:12:23Z (22:12 local)
        const moment = findTonightMoment(ORENBURG, new Date('2026-09-01T12:00:00Z'))

        expect(moment).not.toBeNull()
        expect(Math.abs((moment as Date).getTime() - Date.parse('2026-09-01T17:12:23Z'))).toBeLessThan(5 * MINUTE)
    })

    it('returns the given instant when it is already deep night', () => {
        const night = new Date('2026-09-01T20:00:00Z')

        expect(findTonightMoment(ORENBURG, night)).toBe(night)
    })

    it('skips to the next night when dawn is less than an hour away', () => {
        // Astronomical dawn on 2026-09-02 is at 23:26:45Z (Sep 1); 23:00Z is still dark but too close to it
        const lateNight = new Date('2026-09-01T23:00:00Z')
        const moment = findTonightMoment(ORENBURG, lateNight)

        expect(moment).not.toBeNull()
        expect((moment as Date).getTime()).toBeGreaterThan(Date.parse('2026-09-02T12:00:00Z'))
        expect((moment as Date).getTime()).toBeLessThan(Date.parse('2026-09-02T18:00:00Z'))
    })

    it('degrades to civil twilight for white nights', () => {
        // Saint Petersburg at the June solstice: the Sun never reaches −12°, but does reach −6°
        const moment = findTonightMoment([59.94, 30.31], new Date('2026-06-21T12:00:00Z'))

        expect(moment).not.toBeNull()

        const observer = new Astronomy.Observer(59.94, 30.31, 0)
        expect(sunAltitude(observer, moment as Date)).toBeLessThanOrEqual(-6 + 0.1)
        expect(sunAltitude(observer, moment as Date)).toBeGreaterThan(-12)
    })

    it('returns null during polar day', () => {
        expect(findTonightMoment([78, 15], new Date('2026-06-15T12:00:00Z'))).toBeNull()
    })
})
