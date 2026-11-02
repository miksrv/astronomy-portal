import {
    formatObservatoryTime,
    getAltitude,
    getNight,
    getNightPosition,
    getObservatoryDate,
    getVisibility,
    isCircumpolar,
    isMovingObject
} from './visibility'

describe('visibility', () => {
    // 30 Oct 2026, 20:00 at the observatory (UTC+5)
    const evening = new Date('2026-10-30T15:00:00Z')

    describe('getAltitude', () => {
        it('puts Polaris at roughly the observer latitude', () => {
            // Polaris: RA 37.95°, Dec +89.26°
            expect(getAltitude(37.95, 89.26, evening, 51.7, 55.2)).toBeGreaterThan(50.5)
            expect(getAltitude(37.95, 89.26, evening, 51.7, 55.2)).toBeLessThan(53)
        })

        it('never exceeds the zenith', () => {
            for (let h = 0; h < 24; h++) {
                const altitude = getAltitude(120, 51.7, new Date(evening.getTime() + h * 3_600_000), 51.7, 55.2)
                expect(altitude).toBeLessThanOrEqual(90)
            }
        })
    })

    describe('getNight', () => {
        it('starts at the last local noon (07:00 UTC)', () => {
            expect(getNight(evening).start.toISOString()).toBe('2026-10-30T07:00:00.000Z')
        })

        it('starts the day before when it is still morning', () => {
            const morning = new Date('2026-10-31T03:00:00Z')
            expect(getNight(morning).start.toISOString()).toBe('2026-10-30T07:00:00.000Z')
        })

        it('samples the whole 24 hours, both ends included', () => {
            const night = getNight(evening, 10)
            expect(night.samples).toHaveLength(145)
            expect(night.samples.at(-1)?.time.getTime()).toBe(night.start.getTime() + 86_400_000)
        })

        it('has dark hours in autumn', () => {
            expect(getNight(evening).samples.some(({ sun }) => sun < -12)).toBe(true)
        })
    })

    describe('getNightPosition', () => {
        it('is the fraction of the night passed, clamped to 0..1', () => {
            const night = getNight(evening)
            expect(getNightPosition(night, night.start)).toBe(0)
            expect(getNightPosition(night, new Date('2026-10-30T19:00:00Z'))).toBeCloseTo(0.5)
            expect(getNightPosition(night, new Date('2026-11-02T00:00:00Z'))).toBe(1)
        })
    })

    describe('getVisibility', () => {
        const night = getNight(evening)

        it('finds an autumn object high at night', () => {
            // IC 1396 in Cepheus
            const visibility = getVisibility(323.977, 57.5555, night)
            expect(visibility.level).toBe('high')
            expect(visibility.altitude).toBeGreaterThan(70)
            expect(visibility.time).toBeInstanceOf(Date)
        })

        it('reports a far southern object as not visible', () => {
            expect(getVisibility(83.8, -70, night).level).toBe('none')
        })
    })

    it('treats comets, asteroids and planets as moving objects', () => {
        expect(isMovingObject([8])).toBe(true)
        expect(isMovingObject([1, 9])).toBe(true)
        expect(isMovingObject([1, 2])).toBe(false)
        expect(isMovingObject()).toBe(false)
    })

    it('knows circumpolar declinations', () => {
        expect(isCircumpolar(57.5, 51.7)).toBe(true)
        expect(isCircumpolar(20, 51.7)).toBe(false)
    })

    it('formats time at the observatory', () => {
        expect(formatObservatoryTime(evening)).toBe('20:00')
        expect(formatObservatoryTime()).toBe('—')
    })

    it('dates a moment by the observatory calendar', () => {
        // 20:20 UTC on the 2nd is 01:20 on the 3rd at the observatory
        expect(getObservatoryDate(new Date('2026-11-02T20:20:00Z'))).toBe('2026-11-03')
        expect(getObservatoryDate(new Date('2026-11-02T12:00:00Z'))).toBe('2026-11-02')
    })
})
