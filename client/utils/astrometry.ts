import { ApiModel } from '@/api'
import { PixelPoint, skyToPixel } from '@/utils/wcs'

/** `M 81`, `M_81`, `m81` → `M81`: one key for a designation however it is spelled */
export const normalizeDesignation = (designation: string): string => designation.replace(/[\s_]+/g, '').toUpperCase()

export interface LocatedObject extends PixelPoint {
    /** The service's catalogue entry on the same spot, with its size and its other names */
    twin?: ApiModel.AstrometryAnnotation
}

/**
 * Where one of our objects is on a solved picture, in the solved file's pixels, or `undefined`
 * when it is off the picture. Our catalog's coordinates are rough (an arc minute or more off a
 * galaxy's centre), so a catalogue object of the service whose ring contains the point is taken
 * for the same object: its centre, size and names then belong to ours.
 */
export const locateObject = (
    astrometry: ApiModel.SolvedAstrometry,
    object: { ra: number; dec: number }
): LocatedObject | undefined => {
    const { wcs, solvedWidth: width, solvedHeight: height } = astrometry

    if (!wcs) {
        return undefined
    }

    const point = skyToPixel(wcs, object)

    if (!point || point.x < 0 || point.x > width || point.y < 0 || point.y > height) {
        return undefined
    }

    const twin = (astrometry.annotations ?? []).find(
        (item) =>
            !['bright', 'hd', 'hip', 'tycho2'].includes(item.type) &&
            Math.hypot(point.x - item.pixelx, point.y - item.pixely) < Math.max(width * 0.02, item.radius)
    )

    return twin ? { x: twin.pixelx, y: twin.pixely, twin } : point
}

/** The other names the service knows an object by: "NGC 3031" for M 81 */
export const objectAliases = (
    astrometry: ApiModel.SolvedAstrometry,
    object: { name: string; ra: number; dec: number }
): string[] => {
    const own = normalizeDesignation(object.name)

    return locateObject(astrometry, object)?.twin?.names.filter((alias) => normalizeDesignation(alias) !== own) ?? []
}
