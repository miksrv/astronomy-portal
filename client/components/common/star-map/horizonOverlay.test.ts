import { HORIZON_FIT_FRACTION } from './constants'
import {
    buildTreeOutline,
    collectVisibleRuns,
    COMPASS_POINTS,
    computeGroundGradientRadii,
    computeHorizonTargetRadius,
    GROUND_GRADIENT_SPAN,
    hillHeightDeg,
    MAX_SAMPLE_DISTANCE_DEG,
    seededRandom
} from './horizonOverlay'
import { angularDistanceDeg, DOME_VIEW } from './horizonView'

describe('star-map horizonOverlay', () => {
    describe('MAX_SAMPLE_DISTANCE_DEG', () => {
        it('admits the whole silhouette as seen from the whole-sky dome', () => {
            // The ground fill traces the silhouette, and from DOME_VIEW its far side sits
            // ~89.5° away — a tighter margin dropped it and left the dome a bare circle
            for (let azimuth = 0; azimuth < 360; azimuth += 3) {
                expect(angularDistanceDeg(DOME_VIEW, { azimuth, altitude: hillHeightDeg(azimuth) })).toBeLessThan(
                    MAX_SAMPLE_DISTANCE_DEG
                )
            }
        })

        it('stays inside the projection\u2019s 90° clip', () => {
            expect(MAX_SAMPLE_DISTANCE_DEG).toBeLessThan(90)
        })
    })

    describe('computeHorizonTargetRadius', () => {
        it('fits the dome to the smaller side of the visible area, leaving a label margin', () => {
            // Landscape: the canvas may be far wider than tall — height is the limit
            expect(computeHorizonTargetRadius({ width: 1160, height: 700 })).toBeCloseTo(350 * HORIZON_FIT_FRACTION, 6)
            // Portrait: width is the limit
            expect(computeHorizonTargetRadius({ width: 390, height: 700 })).toBeCloseTo(195 * HORIZON_FIT_FRACTION, 6)
        })

        it('is independent of the canvas overflow — only the viewport matters', () => {
            const visible = computeHorizonTargetRadius({ width: 1160, height: 700 })
            const square = computeHorizonTargetRadius({ width: 700, height: 700 })

            expect(visible).toBe(square)
        })
    })

    describe('hillHeightDeg', () => {
        it('stays within a sensible stylized range', () => {
            for (let azimuth = 0; azimuth <= 360; azimuth += 1) {
                const height = hillHeightDeg(azimuth)

                expect(height).toBeGreaterThanOrEqual(0.6)
                expect(height).toBeLessThan(8)
            }
        })

        it('is continuous across the 0°/360° wrap', () => {
            expect(hillHeightDeg(0)).toBeCloseTo(hillHeightDeg(360), 10)
        })
    })

    describe('seededRandom', () => {
        it('is deterministic and bounded to [0, 1)', () => {
            for (const seed of [0, 1, 7.13, 42, 356.5]) {
                const value = seededRandom(seed)

                expect(value).toBe(seededRandom(seed))
                expect(value).toBeGreaterThanOrEqual(0)
                expect(value).toBeLessThan(1)
            }
        })
    })

    describe('buildTreeOutline', () => {
        it('is deterministic for the same seed', () => {
            expect(buildTreeOutline(120, 3, 5)).toStrictEqual(buildTreeOutline(120, 3, 5))
        })

        it('keeps every vertex near the anchor azimuth and above-ish the base', () => {
            for (const seed of [0, 1, 2, 3, 4, 5]) {
                for (const [azimuth, altitude] of buildTreeOutline(180, 3, seed)) {
                    expect(Math.abs(azimuth - 180)).toBeLessThanOrEqual(1.5)
                    // A deciduous canopy may dip slightly below the base to sit in the hills
                    expect(altitude).toBeGreaterThanOrEqual(3 - 0.5)
                    expect(altitude).toBeLessThanOrEqual(3 + 4)
                }
            }
        })

        it('reaches visibly above the base (a tree, not a bump)', () => {
            for (const seed of [0, 1, 2, 3, 4, 5]) {
                const top = Math.max(...buildTreeOutline(90, 2, seed).map(([, altitude]) => altitude))

                expect(top).toBeGreaterThan(2 + 1)
            }
        })
    })

    describe('collectVisibleRuns', () => {
        it('returns one run for a fully visible horizon', () => {
            expect(collectVisibleRuns([true, true, true, true])).toStrictEqual([[0, 1, 2, 3]])
        })

        it('returns nothing when nothing projects', () => {
            expect(collectVisibleRuns([false, false, false])).toStrictEqual([])
        })

        it('splits on gaps and drops single-point runs (they cannot form a polygon)', () => {
            expect(collectVisibleRuns([true, true, false, true, false, true, true, false])).toStrictEqual([
                [0, 1],
                [5, 6]
            ])
        })

        it('merges a run wrapping through azimuth 0 into a single run', () => {
            // Last two and first two samples are visible: due north is one continuous stretch
            expect(collectVisibleRuns([true, true, false, false, true, true])).toStrictEqual([[4, 5, 0, 1]])
        })

        it('keeps a wrapping merge from swallowing runs in between', () => {
            expect(collectVisibleRuns([true, true, false, true, true, false, true, true])).toStrictEqual([
                [3, 4],
                [6, 7, 0, 1]
            ])
        })
    })

    describe('computeGroundGradientRadii', () => {
        it('spans from just inside the horizon to past the fitted dome corner', () => {
            const [inner, outer] = computeGroundGradientRadii(300)

            expect(inner).toBeCloseTo(300 * GROUND_GRADIENT_SPAN[0], 6)
            expect(outer).toBeCloseTo(300 * GROUND_GRADIENT_SPAN[1], 6)
            expect(inner).toBeLessThan(300)
            // The corner of a HORIZON_FIT_FRACTION-fitted square viewport sits at r * √2 / fraction
            expect(outer).toBeGreaterThan((300 * Math.SQRT2) / HORIZON_FIT_FRACTION - 300)
        })
    })

    describe('COMPASS_POINTS', () => {
        it('covers all eight directions at 45° spacing', () => {
            expect(COMPASS_POINTS.map((point) => point.azimuth)).toStrictEqual([0, 45, 90, 135, 180, 225, 270, 315])
        })
    })
})
