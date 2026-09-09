import { FONT } from './config'
import { StarMapSettings } from './types'

export const POINT_RADIUS = 5
export const POPUP_WIDTH = 200
export const POPUP_HEIGHT = 180
export const POPUP_OFFSET = 10
// Half-width/height of the border-triangle arrow that connects the popup to its marker.
export const POPUP_ARROW_SIZE = 8
// Minimum distance (px) the arrow tip is kept from the popup's left/right edges, so it
// never renders over the popup's rounded corners even when the popup itself had to shift
// away from centering on the marker to stay within the container.
export const POPUP_ARROW_MARGIN = 16

export const STARMAP_STORAGE_KEY = 'astro_starmap_settings'

export const MOBILE_MAX_WIDTH = 768

// How long after a live-clock tick the popup's redraw-driven auto-hide stays suppressed —
// long enough to outlast horizon mode's short zenith-follow rotation the tick triggers.
export const LIVE_TICK_HIDE_GRACE_MS = 1500

// Bounds for the animated time flow's adaptive redraw cadence (see useCelestialDisplay).
// A full Celestial.skyview() measures ~20 ms on a desktop and several times that on a
// phone, so the loop paces itself between "no faster than ~30 fps, which the eye already
// reads as smooth" and "at least four redraws a second, or the flow stops looking like
// motion" — the simulated clock advances every frame either way.
export const MIN_REDRAW_INTERVAL_MS = 33
export const MAX_REDRAW_INTERVAL_MS = 250

// Each redraw is followed by a gap of this many times its own duration, so the flow never
// takes more than ~2/3 of the main thread and gestures, scrolling and the popup stay
// responsive. Measured on /starmap: ~1.5 keeps the animation around 20 fps on a desktop
// with no long tasks at all, while a smaller headroom starts starving input handling.
export const REDRAW_HEADROOM = 1.5

// How often the two places that show the moment (status chip, date field) re-read the
// simulated clock while the flow runs — a second is as fine as a caption needs, and keeps
// React out of the animation loop.
export const TIME_FLOW_DISPLAY_INTERVAL_MS = 1000

// Zoom step of the map rail's +/− buttons — the same factors d3-celestial's own
// #celestial-zoomin/#celestial-zoomout controls use (zoomBy(1.25) / zoomBy(0.8)).
export const ZOOM_STEP_IN = 1.25
export const ZOOM_STEP_OUT = 0.8

/**
 * Fraction of the visible area's smaller side the whole-sky dome is scaled to in horizon
 * mode — the rest is margin, so the horizon circle, its ground silhouette and the compass
 * labels are all inside the frame.
 *
 * It is used twice, and that is the point: it is the projection's *base* width
 * (computeHorizonCanvasLayout) as well as the fit-to-view target
 * (computeHorizonTargetRadius). d3-celestial clamps zooming out at the base scale, so
 * making the base scale the fitted dome is what stops "Небо сейчас" from ever being zoomed
 * out past the whole sky — there is simply nothing below that level to zoom to.
 */
export const HORIZON_FIT_FRACTION = 0.88

/**
 * How close horizon mode opens, as a multiple of the "sky covers the frame" floor
 * (computeHorizonCoverZoom). 1 is the floor itself — the widest possible look-around,
 * roughly a 100° field of view, which reads as a fisheye; larger values open closer.
 *
 * This is the knob for the opening zoom. Celestial's own `zoomlevel` is not: in horizon
 * mode it is the projection's base scale, which also defines the zoom-out floor and the
 * fitted dome (see HORIZON_FIT_FRACTION), so raising it would take the whole-sky view out
 * of the frame again. Only the opening view uses this — leaving the dome by dragging still
 * lands exactly on the floor, so the map never zooms in behind the visitor's back.
 */
export const INITIAL_HORIZON_ZOOM = 1.5

export const DEFAULT_STARMAP_SETTINGS: StarMapSettings = {
    viewMode: 'sky',
    atmosphere: true,
    starsShow: true,
    starsLimit: 6,
    dsosShow: false,
    dsosFull: false,
    customObjectsShow: true,
    meteorShowersShow: false,
    constellationNames: true,
    constellationLines: true,
    constellationBounds: false,
    graticule: true,
    equatorial: false,
    ecliptic: false,
    galactic: false,
    milkyWay: true,
    planetsShow: true,
    center: [0, 20, 0],
    // The observatory's coordinates — same fallback as defaultConfig.geopos
    geopos: [51.82, 55.17]
}

export const STARS_LIMIT_OPTIONS = Array.from({ length: 6 }, (_, i) => ({
    key: i + 1,
    value: String(i + 1)
}))

export const stylePoint = {
    fill: 'rgba(252,130,130,0.4)',
    stroke: '#ff0000',
    width: 1
}

export const styleText = {
    align: 'left',
    baseline: 'bottom',
    fill: '#ff0000',
    font: `12px ${FONT}`
}
