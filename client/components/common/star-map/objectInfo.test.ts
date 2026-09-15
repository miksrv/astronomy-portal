import { Body } from 'astronomy-engine'

import {
    azimuthToCompassKey,
    computeBodyInfo,
    computeFixedObjectInfo,
    createHorizontalToEquatorial,
    equatorialToHorizontal,
    getBodyPositions,
    horizontalToEquatorial,
    horizontalToVector
} from './objectInfo'

// Fixed inputs so results are deterministic
const GEOPOS: [number, number] = [51.82, 55.17]
const DATE = new Date('2026-08-28T20:00:00Z')

describe('star-map objectInfo', () => {
    describe('azimuthToCompassKey', () => {
        it('maps azimuths to the nearest compass point', () => {
            expect(azimuthToCompassKey(0)).toBe('n')
            expect(azimuthToCompassKey(90)).toBe('e')
            expect(azimuthToCompassKey(182)).toBe('s')
            expect(azimuthToCompassKey(315)).toBe('nw')
        })

        it('normalizes out-of-range azimuths', () => {
            expect(azimuthToCompassKey(359)).toBe('n')
            expect(azimuthToCompassKey(-45)).toBe('nw')
            expect(azimuthToCompassKey(450)).toBe('e')
        })
    })

    describe('equatorialToHorizontal', () => {
        it('puts Polaris at an altitude close to the observer latitude', () => {
            // Polaris: RA 2h31m ≈ 37.95°, Dec +89.26°
            const { altitude, azimuth } = equatorialToHorizontal(37.95, 89.26, GEOPOS, DATE)

            expect(Math.abs(altitude - GEOPOS[0])).toBeLessThan(1.5)
            expect(azimuth > 358 || azimuth < 2).toBe(true)
        })
    })

    describe('horizontalToEquatorial', () => {
        it('round-trips through equatorialToHorizontal', () => {
            const [ra, dec] = horizontalToEquatorial(135, 30, GEOPOS, DATE)
            const back = equatorialToHorizontal(ra, dec, GEOPOS, DATE)

            expect(Math.abs(back.azimuth - 135)).toBeLessThan(0.3)
            expect(Math.abs(back.altitude - 30)).toBeLessThan(0.3)
        })

        it('returns RA in the (-180, 180] range d3-celestial data uses', () => {
            for (const azimuth of [0, 90, 180, 270]) {
                const [ra] = horizontalToEquatorial(azimuth, 0, GEOPOS, DATE)

                expect(ra).toBeGreaterThan(-180)
                expect(ra).toBeLessThanOrEqual(180)
            }
        })
    })

    describe('createHorizontalToEquatorial', () => {
        it('converts precomputed horizontal vectors exactly like the single-point call', () => {
            const convert = createHorizontalToEquatorial(GEOPOS, DATE)

            for (const [azimuth, altitude] of [
                [0, 0.05],
                [47, 3.2],
                [180, 30],
                [270, 89.99],
                [359, 1]
            ] as Array<[number, number]>) {
                const [ra, dec] = horizontalToEquatorial(azimuth, altitude, GEOPOS, DATE)
                const [batchRa, batchDec] = convert(horizontalToVector(azimuth, altitude))

                expect(batchRa).toBeCloseTo(ra, 9)
                expect(batchDec).toBeCloseTo(dec, 9)
            }
        })

        it('depends on the place and instant only through the converter, not the vectors', () => {
            const vector = horizontalToVector(120, 40)
            const here = createHorizontalToEquatorial(GEOPOS, DATE)(vector)
            const later = createHorizontalToEquatorial(GEOPOS, new Date(DATE.getTime() + 6 * 3_600_000))(vector)

            // Six hours later the same direction points ~90° further along in RA
            expect(Math.abs(here[0] - later[0])).toBeGreaterThan(60)
            expect(here[1]).not.toBeCloseTo(later[1], 1)
        })
    })

    describe('getBodyPositions', () => {
        it('returns the Sun, the Moon and seven planets with valid coordinates', () => {
            const positions = getBodyPositions(GEOPOS, DATE)

            expect(positions).toHaveLength(9)
            expect(positions.map((p) => p.kind)).toContain('sun')
            expect(positions.map((p) => p.kind)).toContain('moon')

            for (const position of positions) {
                expect(position.ra).toBeGreaterThanOrEqual(0)
                expect(position.ra).toBeLessThan(360)
                expect(Math.abs(position.dec)).toBeLessThanOrEqual(90)
            }
        })
    })

    describe('computeBodyInfo', () => {
        it('computes Moon phase, illumination, distance and rise/set', () => {
            const info = computeBodyInfo(Body.Moon, 'Луна', GEOPOS, DATE)

            expect(info.kind).toBe('moon')
            expect(info.moonPhase).toBeGreaterThanOrEqual(0)
            expect(info.moonPhase).toBeLessThanOrEqual(1)
            expect(info.moonIllumination).toBeGreaterThanOrEqual(0)
            expect(info.moonIllumination).toBeLessThanOrEqual(100)
            // Lunar distance is always within ~356k–407k km
            expect(info.moonDistanceKm).toBeGreaterThan(350_000)
            expect(info.moonDistanceKm).toBeLessThan(410_000)
        })

        it('computes planet magnitude, phase and distance', () => {
            const info = computeBodyInfo(Body.Mars, 'Марс', GEOPOS, DATE)

            expect(info.kind).toBe('planet')
            expect(typeof info.magnitude).toBe('number')
            expect(info.phaseFraction).toBeGreaterThan(0)
            expect(info.phaseFraction).toBeLessThanOrEqual(100)
            expect(info.distanceAu).toBeGreaterThan(0.3)
        })

        it('computes Sun rise/set for a mid-latitude summer date', () => {
            const info = computeBodyInfo(Body.Sun, 'Солнце', GEOPOS, DATE)

            expect(info.kind).toBe('sun')
            expect(info.rise).toBeInstanceOf(Date)
            expect(info.set).toBeInstanceOf(Date)
        })
    })

    describe('computeFixedObjectInfo', () => {
        it('normalizes RA and computes altitude/azimuth', () => {
            const info = computeFixedObjectInfo(
                { kind: 'star', name: 'Test', ra: -90, dec: 45, magnitude: 2.5 },
                GEOPOS,
                DATE
            )

            expect(info.ra).toBe(270)
            expect(info.magnitude).toBe(2.5)
            expect(Math.abs(info.altitude)).toBeLessThanOrEqual(90)
            expect(info.azimuth).toBeGreaterThanOrEqual(0)
            expect(info.azimuth).toBeLessThan(360)
        })
    })
})
