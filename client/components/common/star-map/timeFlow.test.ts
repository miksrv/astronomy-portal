import {
    advanceClock,
    formatTimeRate,
    MAX_FRAME_ELAPSED_MS,
    stepTimeRate,
    TIME_RATE_MAX,
    TIME_RATE_MIN
} from './timeFlow'

const units = { minute: 'мин/с', hour: 'ч/с', day: 'сут/с' }

describe('star-map timeFlow', () => {
    describe('stepTimeRate', () => {
        it('multiplies by the given factor', () => {
            expect(stepTimeRate(1, 2)).toBe(2)
            expect(stepTimeRate(2, 8)).toBe(16)
            expect(stepTimeRate(16, 0.5)).toBe(8)
            expect(stepTimeRate(64, 0.125)).toBe(8)
        })

        it('never runs slower than real time', () => {
            expect(stepTimeRate(1, 0.5)).toBe(TIME_RATE_MIN)
            expect(stepTimeRate(2, 0.125)).toBe(TIME_RATE_MIN)
        })

        it('caps the acceleration', () => {
            expect(stepTimeRate(TIME_RATE_MAX, 8)).toBe(TIME_RATE_MAX)
            expect(stepTimeRate(65_536, 2)).toBe(TIME_RATE_MAX)
        })

        it('falls back to real time for nonsense input', () => {
            expect(stepTimeRate(Number.NaN, 2)).toBe(TIME_RATE_MIN)
            expect(stepTimeRate(4, 0)).toBe(TIME_RATE_MIN)
        })
    })

    describe('formatTimeRate', () => {
        it('shows a bare multiplier while it stays readable', () => {
            expect(formatTimeRate(1, units)).toBe('×1')
            expect(formatTimeRate(32, units)).toBe('×32')
        })

        it('switches to sky-per-second at speed', () => {
            expect(formatTimeRate(60, units)).toBe('1 мин/с')
            expect(formatTimeRate(64, units)).toBe('1.1 мин/с')
            expect(formatTimeRate(3600, units)).toBe('1 ч/с')
            expect(formatTimeRate(TIME_RATE_MAX, units)).toBe('1 сут/с')
        })
    })

    describe('advanceClock', () => {
        const base = new Date('2026-09-09T20:00:00Z')

        it('advances by the elapsed time multiplied by the rate', () => {
            expect(advanceClock(base, 16, 60).getTime() - base.getTime()).toBe(960)
        })

        it('clamps a long frame so the sky never jumps', () => {
            const jump = advanceClock(base, 10_000, 3600).getTime() - base.getTime()

            expect(jump).toBe(MAX_FRAME_ELAPSED_MS * 3600)
        })

        it('ignores a negative delta', () => {
            expect(advanceClock(base, -50, 100).getTime()).toBe(base.getTime())
        })
    })
})
