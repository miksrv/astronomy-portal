import { DEG, normalizeDegrees, shortestAngleDeg, toCelestialLon } from './angles'

describe('star-map angles', () => {
    it('DEG converts degrees to radians', () => {
        expect(180 * DEG).toBeCloseTo(Math.PI, 12)
    })

    describe('normalizeDegrees', () => {
        it('wraps into [0, 360)', () => {
            expect(normalizeDegrees(0)).toBe(0)
            expect(normalizeDegrees(360)).toBe(0)
            expect(normalizeDegrees(-90)).toBe(270)
            expect(normalizeDegrees(725)).toBe(5)
            expect(normalizeDegrees(-0.5)).toBeCloseTo(359.5, 12)
        })

        it('returns in-range values untouched — no float noise on a re-encode', () => {
            expect(normalizeDegrees(127.44)).toBe(127.44)
            expect(normalizeDegrees(359.999)).toBe(359.999)
        })
    })

    describe('toCelestialLon', () => {
        it('maps RA to the (-180, 180] longitude the d3-celestial data files use', () => {
            expect(toCelestialLon(0)).toBe(0)
            expect(toCelestialLon(90)).toBe(90)
            expect(toCelestialLon(180)).toBe(180)
            expect(toCelestialLon(180.5)).toBe(-179.5)
            expect(toCelestialLon(270)).toBe(-90)
            expect(toCelestialLon(359)).toBe(-1)
        })

        it('accepts RA outside [0, 360) too', () => {
            expect(toCelestialLon(-90)).toBe(-90)
            expect(toCelestialLon(450)).toBe(90)
            expect(toCelestialLon(-270)).toBe(90)
        })

        it('always lands in (-180, 180]', () => {
            for (let ra = -720; ra <= 720; ra += 7.3) {
                const lon = toCelestialLon(ra)

                expect(lon).toBeGreaterThan(-180)
                expect(lon).toBeLessThanOrEqual(180)
            }
        })
    })

    describe('shortestAngleDeg', () => {
        it('measures the shorter way round', () => {
            expect(shortestAngleDeg(0)).toBe(0)
            expect(shortestAngleDeg(30)).toBe(30)
            expect(shortestAngleDeg(-30)).toBe(30)
            expect(shortestAngleDeg(350)).toBe(10)
            expect(shortestAngleDeg(180)).toBe(180)
            expect(shortestAngleDeg(-360)).toBe(0)
            expect(shortestAngleDeg(725)).toBe(5)
        })
    })
})
