import { ZOOM_STEP_IN } from './constants'
import {
    MAX_ZOOM_STEP,
    pinchZoomFactor,
    pointerDistance,
    WHEEL_NOTCH_DELTA,
    wheelDeltaPixels,
    wheelZoomFactor
} from './horizonNavigation'

describe('star-map horizonNavigation', () => {
    describe('pinchZoomFactor', () => {
        it('zooms by the ratio of the finger distances', () => {
            expect(pinchZoomFactor(100, 120)).toBeCloseTo(1.2, 6)
            expect(pinchZoomFactor(120, 100)).toBeCloseTo(100 / 120, 6)
        })

        it('clamps a single frame so a jumpy touch cannot fling the zoom', () => {
            expect(pinchZoomFactor(10, 1000)).toBe(MAX_ZOOM_STEP)
            expect(pinchZoomFactor(1000, 10)).toBeCloseTo(1 / MAX_ZOOM_STEP, 6)
        })

        it('is a no-op for a missing or degenerate previous distance', () => {
            expect(pinchZoomFactor(0, 120)).toBe(1)
            expect(pinchZoomFactor(120, 0)).toBe(1)
            expect(pinchZoomFactor(Number.NaN, 120)).toBe(1)
        })
    })

    describe('wheelZoomFactor', () => {
        it('zooms in by one rail step per wheel notch up', () => {
            expect(wheelZoomFactor(-WHEEL_NOTCH_DELTA)).toBeCloseTo(ZOOM_STEP_IN, 6)
            expect(wheelZoomFactor(WHEEL_NOTCH_DELTA)).toBeCloseTo(1 / ZOOM_STEP_IN, 6)
        })

        it('is a no-op without movement and clamps a flung trackpad', () => {
            expect(wheelZoomFactor(0)).toBe(1)
            expect(wheelZoomFactor(-5000)).toBe(MAX_ZOOM_STEP)
            expect(wheelZoomFactor(5000)).toBeCloseTo(1 / MAX_ZOOM_STEP, 6)
        })
    })

    describe('wheelDeltaPixels', () => {
        it('passes pixel deltas through and scales line/page deltas up', () => {
            expect(wheelDeltaPixels(-120, 0)).toBe(-120)
            expect(wheelDeltaPixels(-3, 1)).toBe(-99)
            expect(wheelDeltaPixels(-1, 2)).toBe(-300)
        })
    })

    describe('pointerDistance', () => {
        it('measures the gap between two fingers', () => {
            expect(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
        })
    })
})
