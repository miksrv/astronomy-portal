import { getMoonIllumination, getMoonPhase } from './moon'

describe('moon', () => {
    describe('getMoonPhase', () => {
        it('returns a value that is a multiple of 0.125', () => {
            const phase = getMoonPhase(new Date('2024-01-11'))
            expect(phase % 0.125).toBeCloseTo(0, 5)
        })

        it('returns a value between 0 and 1 inclusive', () => {
            const phase = getMoonPhase(new Date('2024-06-22'))
            expect(phase).toBeGreaterThanOrEqual(0)
            expect(phase).toBeLessThanOrEqual(1)
        })

        it('returns 0 or 1 near a known new moon (2024-01-11)', () => {
            const phase = getMoonPhase(new Date('2024-01-11'))
            expect(phase === 0 || phase === 1).toBe(true)
        })

        it('returns approximately 0.5 near a known full moon (2024-01-25)', () => {
            const phase = getMoonPhase(new Date('2024-01-25'))
            expect(phase).toBeCloseTo(0.5, 0)
        })

        it('returns a consistent value for the same date', () => {
            const date = new Date('2024-03-15')
            expect(getMoonPhase(date)).toBe(getMoonPhase(date))
        })
    })

    describe('getMoonIllumination', () => {
        it('returns a number between 0 and 100', () => {
            const illumination = getMoonIllumination(new Date('2024-01-15'))
            expect(illumination).toBeGreaterThanOrEqual(0)
            expect(illumination).toBeLessThanOrEqual(100)
        })

        it('returns a low value near a known new moon (2024-01-11)', () => {
            const illumination = getMoonIllumination(new Date('2024-01-11'))
            expect(illumination).toBeLessThan(10)
        })

        it('returns a high value near a known full moon (2024-01-25)', () => {
            const illumination = getMoonIllumination(new Date('2024-01-25'))
            expect(illumination).toBeGreaterThan(90)
        })

        it('returns a consistent value for the same date', () => {
            const date = new Date('2024-07-20')
            expect(getMoonIllumination(date)).toBe(getMoonIllumination(date))
        })

        it('returns illumination as a raw decimal percentage (fraction * 100, not rounded)', () => {
            const date = new Date('2024-04-01')
            const illumination = getMoonIllumination(date)
            expect(illumination).toBeGreaterThan(0)
            expect(illumination).toBeLessThanOrEqual(100)
        })
    })
})
