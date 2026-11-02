/**
 * World Coordinate System of a plate-solved picture: the TAN (gnomonic) projection with SIP
 * distortion polynomials, as astrometry.net writes it. Enough to put any RA/Dec on the picture's
 * pixels and back, for a coordinate grid and a compass over the photo.
 *
 * @see https://fits.gsfc.nasa.gov/registry/sip.html
 */

/** One term of a SIP polynomial: coefficient of u^i v^j */
export type SipTerm = [i: number, j: number, coefficient: number]

export interface Wcs {
    /** RA/Dec of the reference point, degrees */
    crval: [number, number]
    /** The reference point on the picture, FITS pixels (1-based) */
    crpix: [number, number]
    /** Pixels → degrees around the reference point */
    cd: [[number, number], [number, number]]
    width: number
    height: number
    /** SIP distortions: `a`/`b` pixel → sky, `ap`/`bp` sky → pixel */
    sip?: { a?: SipTerm[]; b?: SipTerm[]; ap?: SipTerm[]; bp?: SipTerm[] }
}

export interface SkyPoint {
    /** Degrees, 0..360 */
    ra: number
    /** Degrees */
    dec: number
}

export interface PixelPoint {
    /** Pixels from the picture's top left, 0-based */
    x: number
    y: number
}

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

const evaluateSip = (terms: SipTerm[] | undefined, u: number, v: number): number =>
    terms?.reduce((sum, [i, j, c]) => sum + c * u ** i * v ** j, 0) ?? 0

/** The sky at a pixel of the picture */
export const pixelToSky = (wcs: Wcs, { x, y }: PixelPoint): SkyPoint => {
    // 0-based picture pixels → FITS pixel offsets from the reference point
    let u = x + 1 - wcs.crpix[0]
    let v = y + 1 - wcs.crpix[1]

    if (wcs.sip) {
        const du = evaluateSip(wcs.sip.a, u, v)
        const dv = evaluateSip(wcs.sip.b, u, v)
        u += du
        v += dv
    }

    // Intermediate world coordinates, degrees on the tangent plane
    const ix = wcs.cd[0][0] * u + wcs.cd[0][1] * v
    const iy = wcs.cd[1][0] * u + wcs.cd[1][1] * v

    // TAN: native spherical coordinates
    const r = Math.hypot(ix, iy)
    const phi = Math.atan2(ix, -iy)
    const theta = Math.atan2(RAD, r)

    // Rotate from the native pole to the celestial one (LONPOLE = 180°)
    const ra0 = wcs.crval[0] * DEG
    const dec0 = wcs.crval[1] * DEG
    const dphi = phi - Math.PI
    const sinDec = Math.sin(theta) * Math.sin(dec0) + Math.cos(theta) * Math.cos(dec0) * Math.cos(dphi)
    const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)))
    const ra =
        ra0 +
        Math.atan2(
            -Math.cos(theta) * Math.sin(dphi),
            Math.sin(theta) * Math.cos(dec0) - Math.cos(theta) * Math.sin(dec0) * Math.cos(dphi)
        )

    return { ra: (((ra * RAD) % 360) + 360) % 360, dec: dec * RAD }
}

/**
 * The pixel of the picture that looks at a point of the sky; `undefined` for a point behind
 * the tangent plane (more than 90° from the picture's centre)
 */
export const skyToPixel = (wcs: Wcs, { ra, dec }: SkyPoint): PixelPoint | undefined => {
    const ra0 = wcs.crval[0] * DEG
    const dec0 = wcs.crval[1] * DEG
    const a = ra * DEG
    const d = dec * DEG
    const da = a - ra0

    const sinTheta = Math.sin(d) * Math.sin(dec0) + Math.cos(d) * Math.cos(dec0) * Math.cos(da)
    const theta = Math.asin(Math.max(-1, Math.min(1, sinTheta)))

    if (theta <= 0) {
        return undefined
    }

    const dphi = Math.atan2(
        -Math.cos(d) * Math.sin(da),
        Math.sin(d) * Math.cos(dec0) - Math.cos(d) * Math.sin(dec0) * Math.cos(da)
    )
    const phi = dphi + Math.PI
    const r = RAD / Math.tan(theta)
    const ix = r * Math.sin(phi)
    const iy = -r * Math.cos(phi)

    // Invert the CD matrix
    const [[a11, a12], [a21, a22]] = wcs.cd
    const det = a11 * a22 - a12 * a21
    let u = (a22 * ix - a12 * iy) / det
    let v = (-a21 * ix + a11 * iy) / det

    if (wcs.sip?.ap || wcs.sip?.bp) {
        const du = evaluateSip(wcs.sip.ap, u, v)
        const dv = evaluateSip(wcs.sip.bp, u, v)
        u += du
        v += dv
    } else if (wcs.sip?.a || wcs.sip?.b) {
        // No inverse polynomials in the header: undo the forward ones by fixed-point iteration
        // (the distortion is a small correction, so a few rounds converge to a fraction of a pixel)
        let pu = u
        let pv = v

        for (let round = 0; round < 8; round++) {
            const nu = u - evaluateSip(wcs.sip.a, pu, pv)
            const nv = v - evaluateSip(wcs.sip.b, pu, pv)
            pu = nu
            pv = nv
        }

        u = pu
        v = pv
    }

    return { x: u + wcs.crpix[0] - 1, y: v + wcs.crpix[1] - 1 }
}

export interface GridLine {
    /** Which coordinate is constant along the line */
    kind: 'ra' | 'dec'
    /** Its value, degrees */
    value: number
    /** The line on the picture, pixels; parts outside the picture included (clip when drawing) */
    points: PixelPoint[]
    /** Where the line enters the picture, for its label; none when it never does */
    label?: PixelPoint & { edge: 'top' | 'right' | 'bottom' | 'left' }
}

export interface SkyGrid {
    lines: GridLine[]
    /** Degrees of RA between the RA lines */
    raStep: number
    /** Degrees between the Dec lines */
    decStep: number
    /** Direction of the sky's north and east at the picture's centre, as a unit vector in pixels (y down) */
    north: PixelPoint
    east: PixelPoint
}

/** Steps between lines, degrees: minutes of arc to degrees for Dec, minutes of time for RA */
const DEC_STEPS = [1 / 60, 2 / 60, 5 / 60, 10 / 60, 15 / 60, 30 / 60, 1, 2, 5, 10, 15, 30]
const RA_STEPS = [1 / 4, 1 / 2, 1, 2, 5, 10, 15, 30, 60, 120, 180].map((minutes) => minutes / 4)

const isInside = (wcs: Wcs, { x, y }: PixelPoint): boolean => x >= 0 && x <= wcs.width && y >= 0 && y <= wcs.height

/** Where the segment from an outside point to an inside one crosses the picture's edge */
const crossing = (wcs: Wcs, outside: PixelPoint, inside: PixelPoint): GridLine['label'] => {
    const candidates: Array<{ t: number; edge: NonNullable<GridLine['label']>['edge'] }> = []
    const dx = inside.x - outside.x
    const dy = inside.y - outside.y

    if (dx !== 0) {
        candidates.push({ t: (0 - outside.x) / dx, edge: 'left' }, { t: (wcs.width - outside.x) / dx, edge: 'right' })
    }

    if (dy !== 0) {
        candidates.push({ t: (0 - outside.y) / dy, edge: 'top' }, { t: (wcs.height - outside.y) / dy, edge: 'bottom' })
    }

    const hit = candidates
        .filter(({ t }) => t >= 0 && t <= 1)
        .map((candidate) => ({
            ...candidate,
            point: { x: outside.x + dx * candidate.t, y: outside.y + dy * candidate.t }
        }))
        .filter(
            ({ point }) =>
                point.x >= -0.5 && point.x <= wcs.width + 0.5 && point.y >= -0.5 && point.y <= wcs.height + 0.5
        )
        .sort((a, b) => b.t - a.t)[0]

    return hit ? { ...hit.point, edge: hit.edge } : undefined
}

const traceLine = (wcs: Wcs, kind: GridLine['kind'], value: number, from: number, to: number): GridLine | undefined => {
    const samples = 120
    const points: PixelPoint[] = []

    for (let i = 0; i <= samples; i++) {
        const other = from + ((to - from) * i) / samples
        const point = skyToPixel(wcs, kind === 'ra' ? { ra: value, dec: other } : { ra: other, dec: value })

        if (point) {
            points.push(point)
        }
    }

    const firstInside = points.findIndex((point) => isInside(wcs, point))

    if (firstInside < 0) {
        return undefined
    }

    const label = firstInside > 0 ? crossing(wcs, points[firstInside - 1]!, points[firstInside]!) : undefined

    return { kind, value, points, label }
}

/**
 * The RA/Dec grid over a solved picture: about `density` lines each way, on round values
 * (whole minutes of time for RA, whole arc minutes for Dec)
 */
export const buildSkyGrid = (wcs: Wcs, density: number = 5): SkyGrid => {
    // The sky the picture covers: sample its edges
    const centre = pixelToSky(wcs, { x: wcs.width / 2, y: wcs.height / 2 })
    const edge: SkyPoint[] = []
    const steps = 40

    for (let i = 0; i <= steps; i++) {
        const fx = (wcs.width * i) / steps
        const fy = (wcs.height * i) / steps
        edge.push(
            pixelToSky(wcs, { x: fx, y: 0 }),
            pixelToSky(wcs, { x: fx, y: wcs.height }),
            pixelToSky(wcs, { x: 0, y: fy }),
            pixelToSky(wcs, { x: wcs.width, y: fy })
        )
    }

    // RA unwrapped around the centre, so a field across 0h has one range
    const unwrap = (ra: number): number => {
        const delta = ((ra - centre.ra + 540) % 360) - 180

        return centre.ra + delta
    }

    const ras = edge.map(({ ra }) => unwrap(ra))
    const decs = edge.map(({ dec }) => dec)
    const raMin = Math.min(...ras)
    const raMax = Math.max(...ras)
    const decMin = Math.min(...decs)
    const decMax = Math.max(...decs)

    const decStep = DEC_STEPS.find((step) => (decMax - decMin) / step <= density) ?? DEC_STEPS[DEC_STEPS.length - 1]!
    const raStep = RA_STEPS.find((step) => (raMax - raMin) / step <= density) ?? RA_STEPS[RA_STEPS.length - 1]!

    const lines: GridLine[] = []

    // Steps are counted as integers: accumulating floats would leave a −1e-17 where 0° belongs
    for (let k = Math.floor(decMin / decStep); k * decStep <= decMax + decStep; k++) {
        const dec = k * decStep

        if (Math.abs(dec) >= 90) {
            continue
        }

        const line = traceLine(wcs, 'dec', dec, raMin - raStep, raMax + raStep)

        if (line) {
            lines.push(line)
        }
    }

    // A field around the pole spans every RA: past a full turn the lines would only repeat
    const raEnd = Math.min(raMax + raStep, raMin + 360 - raStep)

    for (let k = Math.floor(raMin / raStep); k * raStep <= raEnd; k++) {
        const ra = k * raStep
        const line = traceLine(
            wcs,
            'ra',
            ((ra % 360) + 360) % 360,
            Math.max(-89.99, decMin - decStep),
            Math.min(89.99, decMax + decStep)
        )

        if (line) {
            lines.push(line)
        }
    }

    // The compass: a short step north and east of the centre, in pixels
    const origin = skyToPixel(wcs, centre)!
    const toUnit = (point?: PixelPoint): PixelPoint => {
        const dx = (point?.x ?? origin.x) - origin.x
        const dy = (point?.y ?? origin.y) - origin.y
        const length = Math.hypot(dx, dy) || 1

        return { x: dx / length, y: dy / length }
    }
    const step = 1 / 60
    const north = toUnit(skyToPixel(wcs, { ra: centre.ra, dec: Math.min(89.99, centre.dec + step) }))
    const east = toUnit(skyToPixel(wcs, { ra: centre.ra + step / Math.cos(centre.dec * DEG), dec: centre.dec }))

    return { lines, raStep, decStep, north, east }
}

/** A grid line's label: RA as "2ʰ 32ᵐ" (seconds only for steps under a minute), Dec as "+61° 30′" */
export const formatGridValue = (line: Pick<GridLine, 'kind' | 'value'>, step: number): string => {
    if (line.kind === 'dec') {
        const totalMinutes = Math.round(Math.abs(line.value) * 60)
        const degrees = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60

        return `${line.value < 0 && totalMinutes > 0 ? '−' : '+'}${degrees}°${step < 1 ? ` ${String(minutes).padStart(2, '0')}′` : ''}`
    }

    const totalSeconds = Math.round((line.value / 15) * 3600) % 86_400
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${hours}ʰ ${String(minutes).padStart(2, '0')}ᵐ${step < 1 / 4 ? ` ${String(seconds).padStart(2, '0')}ˢ` : ''}`
}
