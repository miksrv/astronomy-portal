import { horizontalToEquatorial } from './objectInfo'

/**
 * The horizon-mode view direction and the math that keeps it level (FE-3 of
 * features/star-atlas-upgrade.md).
 *
 * d3-celestial only knows equatorial centers: `Celestial.rotate({ center: [ra, dec, angle] })`
 * points the projection at an RA/Dec and rolls it by `angle`. A Stellarium-like local view is
 * that same call driven from a horizontal direction instead:
 *
 * - the center is the azimuth/altitude the visitor is looking at, converted to RA/Dec for
 *   the current place and instant;
 * - the roll is the **parallactic angle** at that direction — the angle between "towards the
 *   celestial pole" (which is where a roll of 0 puts screen-up) and "towards the zenith".
 *   Rolling by it puts the zenith straight up, which is exactly what makes the horizon come
 *   out horizontal and the ground stay at the bottom, at every azimuth and altitude.
 *
 * Everything here is pure: no Celestial calls, no DOM. See useHorizonNavigation for the
 * gestures and useCelestialDisplay for where the result is applied.
 */

const DEG = Math.PI / 180

/** Where the visitor is looking, in the local horizontal frame (degrees). */
export type HorizonView = {
    /** Compass azimuth, 0 = north, increasing towards the east */
    azimuth: number
    /** Altitude above the horizon */
    altitude: number
}

/**
 * Looking straight up: the whole-sky dome the mode opens with. Facing south, because that
 * is what puts north at the top and east on the left — the orientation every printed star
 * chart (and today's map) uses.
 */
export const DOME_VIEW: HorizonView = { azimuth: 180, altitude: 89.9 }

/**
 * Altitude limits. The top stops just short of the zenith, where "towards the zenith" — and
 * with it the roll — is undefined. The bottom stops just above the horizon: below it the
 * zenith itself would fall outside the projection's 90° clip circle, which is what the
 * ground fill is measured against (see horizonOverlay.ts), and there is nothing to see down
 * there anyway — the ground is a stylized silhouette, not a landscape.
 */
export const MIN_VIEW_ALTITUDE = 1
export const MAX_VIEW_ALTITUDE = 89.9

/**
 * The altitude used whenever "the zenith" is needed as a direction.
 *
 * Deliberately not 90: `astronomy-engine`'s VectorFromHorizon with refraction runs an
 * inverse-refraction solver that **never returns** for an altitude of exactly 90° (its
 * correction loop oscillates instead of converging), which would hang the render thread. A
 * hundredth of a degree away it converges immediately, and that is also far inside the
 * rounding of everything this is used for.
 */
export const ZENITH_ALTITUDE = 89.99

/** The zenith's J2000 [ra, dec] for an observer and instant. */
export const computeZenith = (geopos: [number, number], date: Date): [number, number] =>
    horizontalToEquatorial(0, ZENITH_ALTITUDE, geopos, date)

/**
 * Wrap an azimuth to [0, 360). Values already in range are returned untouched — the modulo
 * dance would otherwise nudge them by a float epsilon, which is visible when a permalink is
 * decoded and re-encoded.
 */
export const normalizeAzimuth = (azimuth: number): number =>
    azimuth >= 0 && azimuth < 360 ? azimuth : ((azimuth % 360) + 360) % 360

export const clampView = ({ azimuth, altitude }: HorizonView): HorizonView => ({
    azimuth: normalizeAzimuth(azimuth),
    altitude: Math.min(Math.max(altitude, MIN_VIEW_ALTITUDE), MAX_VIEW_ALTITUDE)
})

export const isDomeView = (view: HorizonView): boolean => view.altitude >= MAX_VIEW_ALTITUDE - 0.05

/**
 * Move the view by a drag, given the projection's scale at the view center.
 *
 * Direct manipulation — the sky follows the pointer: dragging right turns the view left
 * (content moves right), dragging down raises it (content moves down). Azimuth changes one
 * degree per screen degree without a 1/cos(altitude) correction: near the zenith that turns
 * a horizontal drag into a spin around the center, which is how it reads in Stellarium too,
 * and it has no singularity to guard against.
 */
export const panView = (start: HorizonView, dx: number, dy: number, degreesPerPixel: number): HorizonView =>
    clampView({
        azimuth: start.azimuth - dx * degreesPerPixel,
        altitude: start.altitude + dy * degreesPerPixel
    })

/** Angular distance (degrees) between two horizontal directions. */
export const angularDistanceDeg = (a: HorizonView, b: HorizonView): number => {
    const cosine =
        Math.sin(a.altitude * DEG) * Math.sin(b.altitude * DEG) +
        Math.cos(a.altitude * DEG) * Math.cos(b.altitude * DEG) * Math.cos((a.azimuth - b.azimuth) * DEG)

    return Math.acos(Math.min(1, Math.max(-1, cosine))) / DEG
}

type Vector = [number, number, number]

const toVector = ([ra, dec]: [number, number]): Vector => [
    Math.cos(dec * DEG) * Math.cos(ra * DEG),
    Math.cos(dec * DEG) * Math.sin(ra * DEG),
    Math.sin(dec * DEG)
]

const dot = (a: Vector, b: Vector): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const cross = (a: Vector, b: Vector): Vector => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
]

/** Component of `target` perpendicular to `axis`, normalized — the on-sphere direction from `axis` towards `target`. */
const tangentTowards = (axis: Vector, target: Vector): Vector | null => {
    const projection = dot(target, axis)
    const tangent: Vector = [
        target[0] - projection * axis[0],
        target[1] - projection * axis[1],
        target[2] - projection * axis[2]
    ]
    const length = Math.hypot(tangent[0], tangent[1], tangent[2])

    if (length < 1e-9) {
        return null
    }

    return [tangent[0] / length, tangent[1] / length, tangent[2] / length]
}

/**
 * The sign that turns the measured pole→zenith angle into d3-celestial's roll. Verified
 * against the running map: with it, the point directly below the view center on the sky
 * (same azimuth, lower altitude) also lands directly below it on the canvas.
 */
const ROLL_SIGN = -1

/** The celestial pole in J2000 — the direction screen-up points at with a roll of 0. */
const NORTH_POLE: Vector = [0, 0, 1]

/**
 * Roll (degrees) that puts the zenith straight up on screen for the given view: the
 * parallactic angle at the view direction, measured between "towards the pole" and "towards
 * the zenith". Computed as an angle between tangent vectors in the same J2000 frame the map
 * and the rest of the overlay use, so no sidereal-time bookkeeping is needed.
 */
export const viewRoll = (view: HorizonView, geopos: [number, number], date: Date): number => {
    const center = toVector(horizontalToEquatorial(view.azimuth, view.altitude, geopos, date))
    const zenith = toVector(computeZenith(geopos, date))

    const towardsPole = tangentTowards(center, NORTH_POLE)
    const towardsZenith = tangentTowards(center, zenith)

    if (!towardsPole || !towardsZenith) {
        // Looking exactly at the pole or exactly at the zenith — no roll is meaningful
        return 0
    }

    const angle = Math.atan2(dot(cross(towardsPole, towardsZenith), center), dot(towardsPole, towardsZenith)) / DEG

    return ROLL_SIGN * angle
}

/** The equatorial center + roll to hand to `Celestial.rotate()` for a view. */
export const viewToCenter = (view: HorizonView, geopos: [number, number], date: Date): [number, number, number] => {
    const [ra, dec] = horizontalToEquatorial(view.azimuth, view.altitude, geopos, date)

    return [ra, dec, viewRoll(view, geopos, date)]
}

/** Angular tolerance (degrees) for deciding the map is already pointed where it was asked to. */
export const CENTER_TOLERANCE_DEG = 0.05

const shortestAngleDeg = (delta: number): number => {
    const wrapped = ((delta % 360) + 360) % 360

    return wrapped > 180 ? 360 - wrapped : wrapped
}

/**
 * Whether the map's live center (as reported by `Celestial.rotate()`) is the one that was
 * requested — both the direction and the roll. Used to tell an outside re-center apart from
 * the state we set ourselves; see useCelestialDisplay's restore.
 */
export const centerMatches = (
    current: [number, number, number],
    wanted: [number, number, number],
    tolerance: number = CENTER_TOLERANCE_DEG
): boolean => {
    const separation =
        Math.acos(
            Math.min(1, Math.max(-1, dot(toVector([current[0], current[1]]), toVector([wanted[0], wanted[1]]))))
        ) / DEG

    return separation <= tolerance && shortestAngleDeg(current[2] - wanted[2]) <= tolerance
}
