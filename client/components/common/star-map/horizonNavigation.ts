import { ZOOM_STEP_IN } from './constants'

/**
 * Gesture plumbing for horizon mode's Stellarium-like navigation (FE-3 of
 * features/star-atlas-upgrade.md). The view direction itself and the math that keeps it
 * level live in horizonView.ts.
 *
 * d3-celestial's built-in interaction is a free equatorial trackball (`d3.geo.zoom`): a
 * drag rotates the sphere around whatever axis the gesture implies, and its wheel/pinch
 * zoom additionally rotates so the point under the cursor stays put. Neither knows anything
 * about the horizon, so both roll the sky — the ground ends up tilted out of the horizontal
 * plane, or overhead. A visitor reads that as the map being broken.
 *
 * So in horizon mode the built-in drag/zoom listeners are detached (see
 * `detachCelestialZoom`) and every gesture is handled here instead: a drag moves the local
 * view direction (azimuth/altitude), the wheel and pinch zoom about the center, and the
 * roll is always recomputed so the zenith stays straight up.
 */

/**
 * Names of the DOM listeners `d3.geo.zoom()` registers on the canvas (d3 v3 namespaces
 * them with `.zoom`). Celestial re-attaches the behaviour on every `display()`, so they
 * are stripped again after each rebuild.
 */
const CELESTIAL_ZOOM_EVENTS = [
    'mousedown.zoom',
    'touchstart.zoom',
    'wheel.zoom',
    'mousewheel.zoom',
    'MozMousePixelScroll.zoom',
    'dblclick.zoom'
]

/**
 * Detach d3-celestial's own drag/zoom behaviour from the canvas.
 *
 * Celestial has an `interactive: false` config flag that would prevent it from attaching
 * the behaviour in the first place, but it is unusable here: the same branch overwrites the
 * canvas's whole inline `style` attribute with a cursor rule, wiping the CSS width/height
 * Celestial had just set — on a HiDPI screen the canvas would then be laid out at its
 * device-pixel size, i.e. twice as large as the container. Removing the listeners leaves
 * the rest of Celestial's setup untouched.
 */
export const detachCelestialZoom = (canvas: HTMLCanvasElement): void => {
    if (typeof d3 === 'undefined') {
        return
    }

    const selection = d3.select(canvas)

    for (const event of CELESTIAL_ZOOM_EVENTS) {
        selection.on(event, null)
    }
}

/** Largest zoom change a single pinch or wheel frame may apply, so one jittery frame can't jump the view. */
export const MAX_ZOOM_STEP = 1.6

const clampZoomFactor = (factor: number): number => Math.min(Math.max(factor, 1 / MAX_ZOOM_STEP), MAX_ZOOM_STEP)

/** Zoom factor for a pinch: the ratio of the two-finger distance to the previous frame's. */
export const pinchZoomFactor = (previousDistance: number, distance: number): number => {
    if (!(previousDistance > 0) || !(distance > 0)) {
        return 1
    }

    return clampZoomFactor(distance / previousDistance)
}

/** Wheel delta (px) equivalent to one notch of a classic mouse wheel — one ZOOM_STEP_IN step. */
export const WHEEL_NOTCH_DELTA = 100

/**
 * Zoom factor for an accumulated wheel delta in pixels: one notch up = one zoom-in step,
 * a trackpad's many small deltas add up to the same curve instead of stepping.
 */
export const wheelZoomFactor = (deltaY: number): number =>
    clampZoomFactor(Math.pow(ZOOM_STEP_IN, -deltaY / WHEEL_NOTCH_DELTA))

/** Normalize a wheel event's delta to pixels — Firefox reports lines/pages, Chrome pixels. */
export const wheelDeltaPixels = (deltaY: number, deltaMode: number): number => {
    if (deltaMode === 1) {
        // DOM_DELTA_LINE — roughly a third of a notch per line
        return deltaY * 33
    }

    if (deltaMode === 2) {
        // DOM_DELTA_PAGE
        return deltaY * 300
    }

    return deltaY
}

/**
 * Fallback scale (degrees of sky per pixel of drag) when the projection can't be measured.
 * Roughly a fitted dome on a laptop screen — a drag still moves the view sensibly.
 */
export const FALLBACK_DEGREES_PER_PIXEL = 90 / 350

/** Distance between two pointer positions, for pinch tracking. */
export const pointerDistance = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
    Math.hypot(a.x - b.x, a.y - b.y)

/**
 * How many times in a row the view may be re-asserted without ever being observed in place.
 * Each restore reacts to a redraw and causes one, so an outright disagreement with Celestial
 * would otherwise be a redraw loop; a successful restore resets the count, which is why the
 * limit can stay small (several resets can legitimately arrive in a row — React StrictMode
 * displays the map twice, and each display can re-center on its own).
 */
export const MAX_VIEW_RESTORE_ATTEMPTS = 5
