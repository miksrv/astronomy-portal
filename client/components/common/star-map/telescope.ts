import type { ApiModel } from '@/api'

/** A telescope pointing on the map: J2000 degrees, the camera's field of view in degrees */
export interface StarMapTelescope {
    ra: number
    dec: number
    fov?: { width: number; height: number } | null
    /** The last GOTO; drawn as a second, lighter marker when it differs from the pointing */
    target?: { ra: number; dec: number } | null
    /** The caption next to the marker (translated by the caller) */
    label?: string
    /** The second line of the caption: the coordinates */
    detail?: string
}

/** Two directions closer than this (degrees) are the same place for the eye */
export const SAME_POINT_DEGREES = 0.05

/** Angular distance between two directions in degrees (the haversine formula) */
export const angularSeparation = (ra1: number, dec1: number, ra2: number, dec2: number): number => {
    const rad = Math.PI / 180
    const dDec = (dec2 - dec1) * rad
    const dRa = (ra2 - ra1) * rad
    const a = Math.sin(dDec / 2) ** 2 + Math.cos(dec1 * rad) * Math.cos(dec2 * rad) * Math.sin(dRa / 2) ** 2

    return (2 * Math.asin(Math.min(1, Math.sqrt(a))) * 180) / Math.PI
}

/** The GOTO target worth a marker of its own: there is one and it is not where the telescope looks */
export const getVisibleTarget = (telescope: StarMapTelescope): { ra: number; dec: number } | undefined => {
    const { target } = telescope

    if (!target || angularSeparation(telescope.ra, telescope.dec, target.ra, target.dec) < SAME_POINT_DEGREES) {
        return undefined
    }

    return target
}

/**
 * The outline of a field of view centered at (ra, dec): the corners of a rectangle aligned
 * with the equatorial grid, each side split into `steps` points so the map's projection can
 * bend it. Degrees; RA is widened by 1/cos(dec) so the rectangle stays rectangular on the sky.
 */
export const getFovOutline = (
    ra: number,
    dec: number,
    fov: { width: number; height: number },
    steps: number = 6
): Array<[number, number]> => {
    const halfHeight = fov.height / 2
    const halfWidth = fov.width / 2 / Math.max(0.05, Math.cos((dec * Math.PI) / 180))

    const corner = (kx: number, ky: number): [number, number] => [ra + kx * halfWidth, dec + ky * halfHeight]
    const corners: Array<[number, number]> = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
    const outline: Array<[number, number]> = []

    corners.forEach((from, index) => {
        const to = corners[(index + 1) % corners.length] ?? from

        for (let step = 0; step < steps; step++) {
            const k = step / steps

            outline.push([from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k])
        }
    })

    return outline
}

/**
 * Whether the mount points somewhere worth a marker: a known position, and unparked unless
 * `includeParked` (the observatory's own map shows where the parked tube looks, too)
 */
export const isMountPointing = (
    mount: ApiModel.ObservatoryMount | null | undefined,
    includeParked = false
): mount is ApiModel.ObservatoryMount =>
    !!mount && (includeParked || !mount.parked) && Number.isFinite(mount.raJ2000) && Number.isFinite(mount.decJ2000)

/** What to draw for the observatory's mount: nothing while its position is unknown (or it is parked) */
export const getMountTelescope = (
    mount: ApiModel.ObservatoryMount | null | undefined,
    fov?: { width: number; height: number } | null,
    includeParked = false
): StarMapTelescope | null =>
    isMountPointing(mount, includeParked) ? { ra: mount.raJ2000, dec: mount.decJ2000, fov, target: mount.target } : null
