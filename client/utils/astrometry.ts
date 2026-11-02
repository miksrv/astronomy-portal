import { ApiModel } from '@/api'
import { FieldOfView } from '@/utils/optics'
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

    // The nearest catalogue object whose ring holds the point: a small galaxy inside a big
    // neighbour's ring must not be taken for the neighbour
    let twin: ApiModel.AstrometryAnnotation | undefined
    let nearest = Infinity

    for (const item of astrometry.annotations ?? []) {
        if (['bright', 'hd', 'hip', 'tycho2'].includes(item.type)) {
            continue
        }

        const distance = Math.hypot(point.x - item.pixelx, point.y - item.pixely)

        if (distance < Math.max(width * 0.02, item.radius) && distance < nearest) {
            nearest = distance
            twin = item
        }
    }

    return twin ? { x: twin.pixelx, y: twin.pixely, twin } : point
}

/**
 * The field the plate solve measured, in the published picture's pixels (the solved file may
 * be a downscaled copy): what the optics only estimate, and can't for a crop or a mosaic
 */
export const getSolvedField = (astrometry: ApiModel.SolvedAstrometry, imageWidth?: number): FieldOfView => ({
    scale: (astrometry.pixscale * astrometry.solvedWidth) / (imageWidth || astrometry.solvedWidth),
    width: (astrometry.solvedWidth * astrometry.pixscale) / 3600,
    height: (astrometry.solvedHeight * astrometry.pixscale) / 3600
})

/** The HD/HIP/Tycho stars are drawn only while there are this few of them (PhotoAnnotations) */
export const FAINT_STARS_LIMIT = 12

export const FAINT_STAR_TYPES = ['hd', 'hip', 'tycho2']

/**
 * A solve cut down to what a page draws: the faint stars go when there are too many to draw,
 * and the service's bookkeeping (job, error, dates) goes always. For getServerSideProps, so the
 * page data carries no annotations nobody sees
 */
export const trimAstrometry = (astrometry: ApiModel.SolvedAstrometry): ApiModel.SolvedAstrometry => {
    const annotations = astrometry.annotations ?? []
    const faintStars = annotations.filter(({ type }) => FAINT_STAR_TYPES.includes(type)).length
    const { jobId: _jobId, error: _error, solvedAt: _solvedAt, parity: _parity, ...rest } = astrometry

    return {
        ...rest,
        annotations:
            faintStars <= FAINT_STARS_LIMIT
                ? annotations
                : annotations.filter(({ type }) => !FAINT_STAR_TYPES.includes(type))
    }
}

/** The other names the service knows an object by: "NGC 3031" for M 81 */
export const objectAliases = (
    astrometry: ApiModel.SolvedAstrometry,
    object: { name: string; ra: number; dec: number }
): string[] => {
    const own = normalizeDesignation(object.name)

    return locateObject(astrometry, object)?.twin?.names.filter((alias) => normalizeDesignation(alias) !== own) ?? []
}
