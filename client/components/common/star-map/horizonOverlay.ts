import { FONT } from './config'
import { HORIZON_FIT_FRACTION } from './constants'
import { angularDistanceDeg, computeZenith, DOME_VIEW, HorizonView } from './horizonView'
import { horizontalToEquatorial } from './objectInfo'

/**
 * Horizon-mode overlay (FE-3 of features/star-atlas-upgrade.md): the opaque ground below
 * the horizon topped by a stylized silhouette (generic hills/treeline, not real terrain —
 * Business Rule 9) plus N/E/S/W compass labels, drawn on every Celestial redraw so they
 * stay glued to the horizon circle through pan/zoom.
 *
 * The airy projection clips at exactly 90° from the view center, so everything more than a
 * quarter-turn away — which below the horizon is most of the ground — is simply not
 * projectable. The ground is therefore filled in screen space: from the silhouette's top
 * edge radially outward (away from the projected zenith, i.e. downward on screen) past the
 * canvas edges — see drawGroundSector. This holds for the whole-sky dome and for a
 * Stellarium-style look-around alike; only the projected zenith moves.
 *
 * Celestial.mapProjection() expects equatorial coordinates (the map has no horizontal
 * transform), so each azimuth/altitude sample is converted to J2000 RA/Dec for the
 * current date + location first. Those conversions only change when the date/location
 * change — they're cached; projection to screen happens per redraw.
 */

/** Sampling step along the horizon, degrees of azimuth */
const AZIMUTH_STEP = 3

export const COMPASS_POINTS: Array<{ azimuth: number; key: string }> = [
    { azimuth: 0, key: 'n' },
    { azimuth: 45, key: 'ne' },
    { azimuth: 90, key: 'e' },
    { azimuth: 135, key: 'se' },
    { azimuth: 180, key: 's' },
    { azimuth: 225, key: 'sw' },
    { azimuth: 270, key: 'w' },
    { azimuth: 315, key: 'nw' }
]

const DEG = Math.PI / 180

/**
 * Deterministic, smooth pseudo-terrain height (degrees above the horizon) for an
 * azimuth: a few overlapping sine "hills" plus a high-frequency treeline jitter.
 * Same profile for every visitor — it's a stylized silhouette, not data.
 */
export const hillHeightDeg = (azimuthDeg: number): number => {
    const a = azimuthDeg * DEG

    const hills = 3.2 + Math.sin(a * 2 + 0.8) * 1.8 + Math.sin(a * 5 + 2.4) * 1.1 + Math.sin(a * 9 + 1.1) * 0.7
    const treeline = Math.sin(a * 47) * 0.25 + Math.sin(a * 83 + 0.7) * 0.15

    return Math.max(0.6, hills + treeline)
}

/**
 * The silhouette's bottom edge sits a hair above altitude 0: the airy projection clips
 * at exactly 90° from the zenith, so points at altitude 0 are right on the clip border
 * and get rejected numerically half the time.
 */
const GROUND_BASE_ALT = 0.05

/** Deterministic pseudo-random [0..1) from a numeric seed — same "forest" for every visitor */
export const seededRandom = (seed: number): number => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453
    return value - Math.floor(value)
}

/** Angular spacing of tree slots along the horizon; some slots stay empty (clearings) */
const TREE_STEP = 6

/** Keep the treeline clear of the compass label positions (±degrees of azimuth) */
const COMPASS_CLEARANCE = 5

/**
 * One tree silhouette as [azimuth, altitude] vertices — a three-tier spruce or a
 * rounded deciduous canopy, sized/shaped deterministically from the seed (Stellarium-like
 * stylized treeline, not real vegetation — Business Rule 9).
 */
export const buildTreeOutline = (azimuth: number, base: number, seed: number): Array<[number, number]> => {
    const isConifer = seededRandom(seed + 1) < 0.65
    const height = 1.6 + seededRandom(seed + 2) * 2.2
    const halfWidth = 0.5 + seededRandom(seed + 3) * 0.7

    if (isConifer) {
        return [
            [azimuth - halfWidth, base],
            [azimuth - halfWidth * 0.45, base + height * 0.38],
            [azimuth - halfWidth * 0.72, base + height * 0.42],
            [azimuth - halfWidth * 0.3, base + height * 0.72],
            [azimuth - halfWidth * 0.5, base + height * 0.76],
            [azimuth, base + height],
            [azimuth + halfWidth * 0.5, base + height * 0.76],
            [azimuth + halfWidth * 0.3, base + height * 0.72],
            [azimuth + halfWidth * 0.72, base + height * 0.42],
            [azimuth + halfWidth * 0.45, base + height * 0.38],
            [azimuth + halfWidth, base]
        ]
    }

    // Deciduous: an ellipse-ish canopy whose bottom dips below the hill line, so the
    // crown reads as rooted in the ground rather than floating above it
    const radius = height * 0.5
    const points: Array<[number, number]> = []

    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * 2 * Math.PI
        points.push([azimuth + Math.cos(angle) * halfWidth, base + radius * 0.75 + Math.sin(angle) * radius])
    }

    return points
}

/**
 * One point of the silhouette: its horizontal position (which decides whether it is inside
 * the projection at all, whatever the view direction) and the equatorial coordinates
 * Celestial.mapProjection needs.
 */
export type HorizonSample = HorizonView & { eq: [number, number] }

type HorizonGeometry = {
    /** Samples along the silhouette's top edge */
    upper: HorizonSample[]
    /** Same azimuths at altitude ~0 (the horizon line itself) */
    lower: HorizonSample[]
    /** Tree silhouettes, each a vertex loop */
    trees: HorizonSample[][]
    /** Compass label anchors, just above the silhouette */
    compass: Array<{ key: string; sample: HorizonSample }>
}

let cachedKey = ''
let cachedGeometry: HorizonGeometry | null = null

const buildGeometry = (geopos: [number, number], date: Date): HorizonGeometry => {
    const sample = (azimuth: number, altitude: number): HorizonSample => ({
        azimuth,
        altitude,
        eq: horizontalToEquatorial(azimuth, altitude, geopos, date)
    })

    const upper: HorizonSample[] = []
    const lower: HorizonSample[] = []

    for (let azimuth = 0; azimuth <= 360; azimuth += AZIMUTH_STEP) {
        upper.push(sample(azimuth, hillHeightDeg(azimuth)))
        lower.push(sample(azimuth, GROUND_BASE_ALT))
    }

    // Stylized treeline along the hills: deterministic slots with random gaps, kept
    // clear of the compass label azimuths so С/В/Ю/З stay readable
    const trees: HorizonSample[][] = []

    for (let slot = 0; slot < 360 / TREE_STEP; slot++) {
        const seed = slot * 7.13

        if (seededRandom(seed) < 0.3) {
            continue
        }

        const azimuth = slot * TREE_STEP + (seededRandom(seed + 4) - 0.5) * TREE_STEP

        const nearCompass = COMPASS_POINTS.some(
            (point) =>
                Math.min(Math.abs(azimuth - point.azimuth), 360 - Math.abs(azimuth - point.azimuth)) < COMPASS_CLEARANCE
        )

        if (nearCompass) {
            continue
        }

        const base = Math.max(0.2, hillHeightDeg(azimuth) - 0.25)

        trees.push(
            buildTreeOutline(azimuth, base, seed).map(([treeAzimuth, altitude]) => sample(treeAzimuth, altitude))
        )
    }

    // Labels sit just above the silhouette (and the treetops), inside the dome —
    // anything below the horizon is outside the airy projection's clip circle
    const compass = COMPASS_POINTS.map(({ azimuth, key }) => ({
        key,
        sample: sample(azimuth, hillHeightDeg(azimuth) + 2.5)
    }))

    return { upper, lower, trees, compass }
}

/**
 * Scale the view so the whole horizon circle (with a small margin for the compass
 * labels) fits the canvas. Call right after Celestial.display() in horizon mode —
 * `follow: 'zenith'` centers the view but keeps whatever zoom the config had.
 */
export type ViewportSize = { width: number; height: number }

/**
 * Radius (px) the horizon circle should have to fit the visible area: the fraction of the
 * smaller side. The canvas itself may be larger than what the user sees (in fitContainer
 * mode it spans the full width and is cropped by the container), so the caller passes
 * the *visible* viewport, not the canvas size.
 */
export const computeHorizonTargetRadius = (viewport: ViewportSize): number =>
    (Math.min(viewport.width, viewport.height) / 2) * HORIZON_FIT_FRACTION

/** The horizon circle in screen space: where the zenith projects, and the circle's radius in px. */
export type HorizonCircle = { center: [number, number]; radius: number }

/**
 * Measure the horizon on the current projection: the zenith's pixel position and how far
 * the horizon sits from it — a quarter of the sky in pixels, at the current zoom. Both the
 * ground fill (which extends radially away from the zenith) and the fit-to-view zoom need it.
 *
 * The horizon is sampled straight below the view direction, not due north: that point is
 * exactly `view.altitude` from the center and so always inside the projection's 90° clip,
 * whereas the north point is far outside it as soon as the visitor looks south — where the
 * airy radius runs away and the measurement would be meaningless.
 */
export const measureHorizonCircle = (geopos: [number, number], date: Date, view: HorizonView): HorizonCircle | null => {
    const zenithPx = Celestial.mapProjection(computeZenith(geopos, date))
    const horizonPx = Celestial.mapProjection(horizontalToEquatorial(view.azimuth, 0, geopos, date))

    if (!zenithPx || !horizonPx) {
        return null
    }

    const radius = Math.hypot(horizonPx[0] - zenithPx[0], horizonPx[1] - zenithPx[1])

    return Number.isFinite(radius) && radius > 0 ? { center: [zenithPx[0], zenithPx[1]], radius } : null
}

export const fitHorizonToView = (geopos: [number, number], date: Date, viewport?: ViewportSize): void => {
    const canvas: HTMLCanvasElement | undefined = Celestial.context?.canvas

    if (!canvas) {
        return
    }

    // Only ever called for the whole-sky view, where the dome is centered on the zenith
    const circle = measureHorizonCircle(geopos, date, DOME_VIEW)

    if (!circle) {
        return
    }

    // Without an explicit viewport (non-fitContainer embeds) the canvas is fully visible
    const rect = viewport ?? canvas.getBoundingClientRect()
    const targetRadius = computeHorizonTargetRadius(rect)

    if (targetRadius > 0 && Math.abs(targetRadius / circle.radius - 1) > 0.05) {
        Celestial.zoomBy(targetRadius / circle.radius)
    }
}

/**
 * Ground tones: the strip right below the horizon still catches some light, while the
 * nadir side (the outer edge of the canvas — the ground nearest the observer) goes almost
 * black. The radial gradient between them reads as ground receding into the dark.
 */
const GROUND_NEAR_COLOR = 'rgba(50, 44, 36, 1)'
const GROUND_FAR_COLOR = 'rgba(18, 17, 15, 1)'

/** Flat ground tone for the degenerate case where the zenith itself doesn't project */
const GROUND_FLAT_COLOR = '#2b2620'

/**
 * Rim highlight along the hill crest, so the skyline reads against the sky. Drawn before
 * the treeline, which paints over the stretches it covers — the crest then shows between
 * the trees instead of cutting across them.
 */
const GROUND_RIM_COLOR = 'rgba(150, 137, 110, 0.75)'

/** The treeline sits a shade darker than the hills it grows on, not black */
const TREE_COLOR = 'rgba(38, 33, 27, 1)'

/**
 * Where the ground gradient starts and ends, as multiples of the horizon radius: just
 * inside the horizon (so the hills band is already at the near tone) out to past the
 * canvas corner of a fitted dome (HORIZON_FIT_FRACTION leaves the corner at ~1.6 r).
 */
export const GROUND_GRADIENT_SPAN: [number, number] = [0.98, 1.9]

export const computeGroundGradientRadii = (horizonRadius: number): [number, number] => [
    horizonRadius * GROUND_GRADIENT_SPAN[0],
    horizonRadius * GROUND_GRADIENT_SPAN[1]
]

/**
 * How far past the horizon the ground polygon is pushed, as a multiple of each edge
 * point's distance from the zenith — large enough that the ground always runs off the
 * canvas, whatever the zoom.
 */
export const GROUND_EXTENT_FACTOR = 40

/**
 * Contiguous runs of projectable samples along the horizon, as index lists. Azimuth 0 and
 * 360 are the same sample, so a run that ends at the last index continues into the one
 * that starts at index 0 — they're merged, otherwise the ground would show a seam due
 * north. Runs shorter than two points can't form a polygon and are dropped.
 */
export const collectVisibleRuns = (visible: readonly boolean[]): number[][] => {
    const runs: number[][] = []
    let run: number[] = []

    visible.forEach((isVisible, index) => {
        if (isVisible) {
            run.push(index)
            return
        }

        if (run.length > 1) {
            runs.push(run)
        }

        run = []
    })

    if (run.length > 1) {
        runs.push(run)
    }

    if (runs.length > 1 && runs[0]?.[0] === 0 && runs[runs.length - 1]?.at(-1) === visible.length - 1) {
        const wrapped = runs.shift() as number[]

        runs[runs.length - 1] = [...(runs[runs.length - 1] as number[]), ...wrapped]
    }

    return runs
}

type ScreenPoint = [number, number]

const tracePolyline = (context: CanvasRenderingContext2D, points: ScreenPoint[]): void => {
    const [firstX, firstY] = points[0] as ScreenPoint

    context.moveTo(firstX, firstY)

    for (const [x, y] of points.slice(1)) {
        context.lineTo(x, y)
    }
}

/**
 * Add the ground below one visible stretch of the silhouette to the current path: the
 * top edge forward, then the same points pushed radially away from the zenith far past
 * the canvas. With the whole horizon visible the two loops form a ring that covers
 * everything outside the sky dome; with only part of it visible, a wedge under that part.
 */
export const drawGroundSector = (context: CanvasRenderingContext2D, edge: ScreenPoint[], center: ScreenPoint): void => {
    if (edge.length < 2) {
        return
    }

    tracePolyline(context, edge)

    for (const [x, y] of [...edge].reverse()) {
        context.lineTo(
            center[0] + (x - center[0]) * GROUND_EXTENT_FACTOR,
            center[1] + (y - center[1]) * GROUND_EXTENT_FACTOR
        )
    }

    context.closePath()
}

/**
 * Fallback shape for the (pathological) case of an unprojectable zenith: just the band
 * between the silhouette and the horizon line, with no ground beyond it.
 */
const drawGroundBand = (context: CanvasRenderingContext2D, edge: ScreenPoint[], base: ScreenPoint[]): void => {
    if (edge.length < 2) {
        return
    }

    tracePolyline(context, edge)

    for (const [x, y] of [...base].reverse()) {
        context.lineTo(x, y)
    }

    context.closePath()
}

/**
 * How far from the view center a silhouette sample may sit and still be drawn. The
 * projection clips at exactly 90°; a hair inside that keeps the samples off the border,
 * where the airy radius runs away and Celestial's own clip test flips about.
 *
 * It has to clear the whole-sky dome's silhouette, or that view loses its ground. The dome
 * looks 0.1° off the zenith (DOME_VIEW), so on the far side of the sky every altitude is
 * that much further away: the lowest hill (0.6°) sits ~89.5° out and a tree's roots ~89.9°,
 * while the horizon line itself reaches 90.05° — outside the projection, which is fine,
 * since the ground is filled from the silhouette outward and never needs it. A 1° margin
 * rejected all of them and left the dome a bare circle. projectSample's finite-check is the
 * real safety net; this only keeps samples off the clip border itself.
 */
export const MAX_SAMPLE_DISTANCE_DEG = 89.95

/**
 * Project one silhouette sample to screen, or null when it is outside the projection.
 *
 * Visibility is decided in horizontal coordinates — the angular distance from the direction
 * the visitor is looking — rather than with `Celestial.clip()`, which measures from the
 * *configured* center. Those two used to be the same thing; they no longer are, because
 * horizon mode re-points the map itself and Celestial's config lags a redraw behind, so its
 * verdict would reject a wedge of perfectly visible horizon and leave a hole in the ground.
 */
export const projectSample = (sample: HorizonSample, view: HorizonView): ScreenPoint | null => {
    if (angularDistanceDeg(view, sample) > MAX_SAMPLE_DISTANCE_DEG) {
        return null
    }

    const point = Celestial.mapProjection(sample.eq)

    if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
        return null
    }

    return point as ScreenPoint
}

const createGroundStyle = (context: CanvasRenderingContext2D, circle: HorizonCircle): CanvasGradient => {
    const [inner, outer] = computeGroundGradientRadii(circle.radius)
    const gradient = context.createRadialGradient(
        circle.center[0],
        circle.center[1],
        inner,
        circle.center[0],
        circle.center[1],
        outer
    )

    gradient.addColorStop(0, GROUND_NEAR_COLOR)
    gradient.addColorStop(1, GROUND_FAR_COLOR)

    return gradient
}

export type HorizonOverlayOptions = {
    geopos: [number, number]
    date: Date
    /** Where the visitor is looking — decides which part of the silhouette is on screen */
    view: HorizonView
    /** Localized compass labels keyed by COMPASS_POINTS key ('n', 'ne', ...) */
    labels: Record<string, string>
}

/** Draw the ground (fill, silhouette, treeline) and the compass labels. Call from a Celestial redraw callback. */
export const drawHorizonOverlay = ({ geopos, date, view, labels }: HorizonOverlayOptions): void => {
    const key = `${geopos[0].toFixed(4)}_${geopos[1].toFixed(4)}_${date.getTime()}`

    if (key !== cachedKey || !cachedGeometry) {
        cachedKey = key
        cachedGeometry = buildGeometry(geopos, date)
    }

    const { upper, lower, trees, compass } = cachedGeometry
    const context = Celestial.context
    const circle = measureHorizonCircle(geopos, date, view)

    const upperScreen = upper.map((sample) => projectSample(sample, view))
    const lowerScreen = lower.map((sample) => projectSample(sample, view))

    // The ground fill only traces the silhouette — it extends radially away from the zenith
    // from there, so a horizon sample that failed to project costs nothing. Only the
    // fallback band (drawn when the zenith itself doesn't project) needs both rows.
    const runs = collectVisibleRuns(upperScreen.map((point, index) => Boolean(point && (circle || lowerScreen[index]))))
    const edges = runs.map((run) => run.map((index) => upperScreen[index] as ScreenPoint))

    // Fill the ground: from the silhouette down past the horizon, out to the canvas edges
    context.beginPath()

    edges.forEach((edge, index) => {
        if (circle) {
            drawGroundSector(context, edge, circle.center)
        } else {
            drawGroundBand(
                context,
                edge,
                (runs[index] as number[]).map((sample) => lowerScreen[sample] as ScreenPoint)
            )
        }
    })

    context.fillStyle = circle ? createGroundStyle(context, circle) : GROUND_FLAT_COLOR
    context.fill()

    // Rim along the top edge only — the outer boundary of the fill is off-canvas
    context.beginPath()

    for (const edge of edges) {
        tracePolyline(context, edge)
    }

    context.strokeStyle = GROUND_RIM_COLOR
    context.lineWidth = 1
    context.stroke()

    // Treeline over the hills and the crest rim: a shade darker than the ground, so it
    // reads as vegetation on the skyline rather than a separate dark blob in the sky
    context.beginPath()

    for (const tree of trees) {
        const screen = tree.map((sample) => projectSample(sample, view))

        if (screen.some((point) => !point)) {
            continue
        }

        tracePolyline(context, screen as ScreenPoint[])
        context.closePath()
    }

    context.fillStyle = TREE_COLOR
    context.fill()

    // Compass labels just above the silhouette
    for (const { key: pointKey, sample } of compass) {
        const screen = projectSample(sample, view)

        if (!screen) {
            continue
        }

        const isCardinal = ['n', 'e', 's', 'w'].includes(pointKey)

        Celestial.setTextStyle({
            font: `${isCardinal ? 'bold 14px' : '11px'} ${FONT}`,
            fill: isCardinal ? '#e8b64c' : '#8a93a6',
            align: 'center',
            baseline: 'middle'
        })
        context.fillText(labels[pointKey] ?? pointKey.toUpperCase(), screen[0], screen[1])
    }
}
