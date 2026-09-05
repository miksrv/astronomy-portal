import {
    angularDistanceDeg,
    centerMatches,
    clampView,
    DOME_VIEW,
    HorizonView,
    isDomeView,
    MAX_VIEW_ALTITUDE,
    MIN_VIEW_ALTITUDE,
    normalizeAzimuth,
    panView,
    viewRoll,
    viewToCenter
} from './horizonView'
import { horizontalToEquatorial } from './objectInfo'

const OBSERVER: [number, number] = [51.7, 55.1]
const MOMENT = new Date('2026-09-02T20:30:00Z')

/**
 * Where a horizontal direction lands relative to the view center, in tangent coordinates.
 *
 * This mirrors the rotation d3-celestial applies (center to the origin, then roll) but not
 * its final mirroring of the x axis or the canvas's downward y, so only the *axis* a point
 * falls on is meaningful here — which is exactly what "the horizon is level" means. Which
 * side is up on the actual canvas is verified against the running map instead.
 */
const project = (view: HorizonView, target: HorizonView) => {
    const [ra, dec, roll] = viewToCenter(view, OBSERVER, MOMENT)
    const [targetRa, targetDec] = horizontalToEquatorial(target.azimuth, target.altitude, OBSERVER, MOMENT)

    // The same rotation d3-celestial applies: bring the center to the origin, then roll.
    // Working in gnomonic-ish tangent coordinates is enough to tell up from down.
    const DEG = Math.PI / 180
    const toVector = (r: number, d: number) => [
        Math.cos(d * DEG) * Math.cos(r * DEG),
        Math.cos(d * DEG) * Math.sin(r * DEG),
        Math.sin(d * DEG)
    ]

    const center = toVector(ra, dec)
    const point = toVector(targetRa, targetDec)

    // Tangent basis at the center: "north" (towards the pole) and "east"
    const pole = [0, 0, 1]
    const dot = (a: number[], b: number[]) =>
        (a[0] as number) * (b[0] as number) + (a[1] as number) * (b[1] as number) + (a[2] as number) * (b[2] as number)
    const sub = (a: number[], b: number[], k: number) => a.map((value, index) => value - k * (b[index] as number))
    const norm = (a: number[]) => {
        const length = Math.hypot(a[0] as number, a[1] as number, a[2] as number)
        return a.map((value) => value / length)
    }
    const cross = (a: number[], b: number[]) => [
        (a[1] as number) * (b[2] as number) - (a[2] as number) * (b[1] as number),
        (a[2] as number) * (b[0] as number) - (a[0] as number) * (b[2] as number),
        (a[0] as number) * (b[1] as number) - (a[1] as number) * (b[0] as number)
    ]

    const north = norm(sub(pole, center, dot(pole, center)))
    const east = cross(north, center)

    const offsetNorth = dot(point, north)
    const offsetEast = dot(point, east)

    // A roll of `roll` degrees turns the frame; screen up is `roll` away from north
    const angle = roll * DEG

    return {
        x: offsetEast * Math.cos(angle) - offsetNorth * Math.sin(angle),
        y: offsetEast * Math.sin(angle) + offsetNorth * Math.cos(angle)
    }
}

describe('star-map horizonView', () => {
    describe('clampView', () => {
        it('wraps the azimuth and keeps the altitude inside the navigable range', () => {
            expect(clampView({ azimuth: 370, altitude: 45 })).toStrictEqual({ azimuth: 10, altitude: 45 })
            expect(clampView({ azimuth: -10, altitude: 45 })).toStrictEqual({ azimuth: 350, altitude: 45 })
            expect(clampView({ azimuth: 0, altitude: 120 }).altitude).toBe(MAX_VIEW_ALTITUDE)
            expect(clampView({ azimuth: 0, altitude: -30 }).altitude).toBe(MIN_VIEW_ALTITUDE)
        })
    })

    describe('normalizeAzimuth', () => {
        it('wraps into [0, 360)', () => {
            expect(normalizeAzimuth(0)).toBe(0)
            expect(normalizeAzimuth(360)).toBe(0)
            expect(normalizeAzimuth(-90)).toBe(270)
            expect(normalizeAzimuth(725)).toBe(5)
        })
    })

    describe('isDomeView', () => {
        it('recognizes the whole-sky view, not a look-around', () => {
            expect(isDomeView(DOME_VIEW)).toBe(true)
            expect(isDomeView({ azimuth: 180, altitude: 60 })).toBe(false)
        })
    })

    describe('panView', () => {
        it('follows the pointer: dragging right turns left, dragging down looks higher', () => {
            const start = { azimuth: 180, altitude: 40 }

            expect(panView(start, 100, 0, 0.2)).toStrictEqual({ azimuth: 160, altitude: 40 })
            expect(panView(start, -100, 0, 0.2)).toStrictEqual({ azimuth: 200, altitude: 40 })
            expect(panView(start, 0, 100, 0.2)).toStrictEqual({ azimuth: 180, altitude: 60 })
            expect(panView(start, 0, -100, 0.2)).toStrictEqual({ azimuth: 180, altitude: 20 })
        })

        it('never leaves the navigable altitude range or an unwrapped azimuth', () => {
            const up = panView({ azimuth: 10, altitude: 80 }, 0, 5000, 0.2)
            const down = panView({ azimuth: 10, altitude: 20 }, 0, -5000, 0.2)
            const around = panView({ azimuth: 10, altitude: 20 }, -5000, 0, 0.2)

            expect(up.altitude).toBe(MAX_VIEW_ALTITUDE)
            expect(down.altitude).toBe(MIN_VIEW_ALTITUDE)
            expect(around.azimuth).toBeGreaterThanOrEqual(0)
            expect(around.azimuth).toBeLessThan(360)
        })
    })

    describe('angularDistanceDeg', () => {
        it('measures the gap between two directions in the sky', () => {
            expect(angularDistanceDeg({ azimuth: 0, altitude: 0 }, { azimuth: 0, altitude: 0 })).toBeCloseTo(0, 6)
            expect(angularDistanceDeg({ azimuth: 0, altitude: 0 }, { azimuth: 90, altitude: 0 })).toBeCloseTo(90, 6)
            expect(angularDistanceDeg({ azimuth: 0, altitude: 0 }, { azimuth: 0, altitude: 90 })).toBeCloseTo(90, 6)
            expect(angularDistanceDeg({ azimuth: 0, altitude: 30 }, { azimuth: 0, altitude: 50 })).toBeCloseTo(20, 6)
            // Opposite horizons are half the sky apart, whichever way round they are given
            expect(angularDistanceDeg({ azimuth: 350, altitude: 0 }, { azimuth: 170, altitude: 0 })).toBeCloseTo(180, 6)
        })
    })

    describe('viewRoll / viewToCenter — the horizon stays horizontal', () => {
        it('puts the zenith straight up and the horizon straight down at every azimuth', () => {
            for (const azimuth of [0, 45, 90, 135, 180, 225, 270, 315]) {
                for (const altitude of [5, 30, 60, 85]) {
                    const view = { azimuth, altitude }

                    // A point on the same vertical circle, closer to the horizon, must land
                    // directly below the center: no sideways drift means no tilt
                    const below = project(view, { azimuth, altitude: altitude - 4 })

                    expect(Math.abs(below.x)).toBeLessThan(Math.abs(below.y) * 0.02)

                    // ...and one closer to the zenith on the opposite side of the center
                    const above = project(view, { azimuth, altitude: altitude + 4 })

                    expect(Math.abs(above.x)).toBeLessThan(Math.abs(above.y) * 0.02)
                    expect(Math.sign(above.y)).toBe(-Math.sign(below.y))
                }
            }
        })

        it('returns the equatorial direction of the view as the center', () => {
            const view = { azimuth: 120, altitude: 40 }
            const [ra, dec] = viewToCenter(view, OBSERVER, MOMENT)
            const [expectedRa, expectedDec] = horizontalToEquatorial(view.azimuth, view.altitude, OBSERVER, MOMENT)

            expect(ra).toBeCloseTo(expectedRa, 9)
            expect(dec).toBeCloseTo(expectedDec, 9)
        })

        it('is stable for the dome view — looking straight up has a defined roll', () => {
            expect(Number.isFinite(viewRoll(DOME_VIEW, OBSERVER, MOMENT))).toBe(true)
        })
    })

    describe('centerMatches', () => {
        it('accepts the center it asked for and rejects a re-centered map', () => {
            const wanted = viewToCenter({ azimuth: 200, altitude: 35 }, OBSERVER, MOMENT)

            expect(centerMatches(wanted, wanted)).toBe(true)
            expect(centerMatches([wanted[0] + 0.01, wanted[1], wanted[2]], wanted)).toBe(true)
            expect(centerMatches([wanted[0] + 5, wanted[1], wanted[2]], wanted)).toBe(false)
            expect(centerMatches([wanted[0], wanted[1], wanted[2] + 30], wanted)).toBe(false)
            // The roll is an angle: the same angle written differently still matches
            expect(centerMatches([wanted[0], wanted[1], wanted[2] - 360], wanted)).toBe(true)
        })
    })
})
