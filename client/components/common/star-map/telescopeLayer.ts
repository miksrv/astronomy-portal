import { toCelestialLon } from './angles'
import { FONT } from './config'
import { getFovOutline, getVisibleTarget, StarMapTelescope } from './telescope'

const MARKER_COLOR = '#ffc15a'
const TARGET_COLOR = 'rgba(255, 233, 190, 0.7)'
// The camera frame in its own colour, so it doesn't read as part of the pointing marker
const FOV_COLOR = '#5ec8f2'
const HALO_COLOR = 'rgba(17, 19, 24, 0.85)'

type Point = [number, number]

/** The map's pixel for an RA/Dec (J2000 degrees), or null when it is behind the projection */
const project = (ra: number, dec: number): Point | null => {
    // d3-celestial takes longitudes in ±180 (as the meteor shower layer does)
    const lon = toCelestialLon(ra)

    if (!Celestial.clip([lon, dec])) {
        return null
    }

    const point = Celestial.mapProjection([lon, dec])

    return point && Number.isFinite(point[0]) && Number.isFinite(point[1]) ? point : null
}

const strokeTwice = (context: CanvasRenderingContext2D, color: string, width: number) => {
    context.lineWidth = width + 2
    context.strokeStyle = HALO_COLOR
    context.stroke()
    context.lineWidth = width
    context.strokeStyle = color
    context.stroke()
}

/** A crosshair with an open center, like the telescope marker of KStars and INDI clients */
const drawCrosshair = (context: CanvasRenderingContext2D, [x, y]: Point, radius: number, color: string) => {
    const gap = radius * 0.45
    const reach = radius * 1.7

    context.beginPath()
    context.arc(x, y, radius, 0, 2 * Math.PI)
    strokeTwice(context, color, 1.5)

    context.beginPath()
    context.moveTo(x - reach, y)
    context.lineTo(x - gap, y)
    context.moveTo(x + gap, y)
    context.lineTo(x + reach, y)
    context.moveTo(x, y - reach)
    context.lineTo(x, y - gap)
    context.moveTo(x, y + gap)
    context.lineTo(x, y + reach)
    strokeTwice(context, color, 1.5)
}

const drawFov = (context: CanvasRenderingContext2D, telescope: StarMapTelescope) => {
    if (!telescope.fov) {
        return
    }

    const points = getFovOutline(telescope.ra, telescope.dec, telescope.fov)
        .map(([ra, dec]) => project(ra, dec))
        .filter((point): point is Point => point != null)

    if (points.length < 8) {
        return
    }

    context.beginPath()
    points.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)))
    context.closePath()
    context.fillStyle = 'rgba(94, 200, 242, 0.1)'
    context.fill()
    strokeTwice(context, FOV_COLOR, 1.2)
}

const drawLabel = (context: CanvasRenderingContext2D, [x, y]: Point, radius: number, telescope: StarMapTelescope) => {
    const lines = [telescope.label, telescope.detail].filter((line): line is string => !!line)

    if (!lines.length) {
        return
    }

    context.textAlign = 'left'
    context.textBaseline = 'middle'
    context.lineJoin = 'round'

    lines.forEach((line, index) => {
        const lineY = y - radius * 2 - 4 - (lines.length - 1 - index) * 15
        const lineX = x + radius * 1.9

        context.font = `${index === 0 ? '600 ' : ''}12px ${FONT}`
        context.lineWidth = 3
        context.strokeStyle = HALO_COLOR
        context.strokeText(line, lineX, lineY)
        context.fillStyle = index === 0 ? MARKER_COLOR : '#e8e9f0'
        context.fillText(line, lineX, lineY)
    })
}

/**
 * The telescope drawn over the sky: the camera's field of view, the GOTO target (lighter, when
 * it differs) and a crosshair where the telescope points. Runs at the end of Celestial's redraw.
 */
export const drawTelescope = (telescope: StarMapTelescope): void => {
    const context: CanvasRenderingContext2D = Celestial.context

    drawFov(context, telescope)

    const target = getVisibleTarget(telescope)
    const targetPoint = target ? project(target.ra, target.dec) : null

    if (targetPoint) {
        context.setLineDash([3, 3])
        drawCrosshair(context, targetPoint, 5, TARGET_COLOR)
        context.setLineDash([])
    }

    const point = project(telescope.ra, telescope.dec)

    if (point) {
        drawCrosshair(context, point, 7, MARKER_COLOR)
        drawLabel(context, point, 7, telescope)
    }
}
