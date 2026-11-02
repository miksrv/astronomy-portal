import { getFieldOfView, Optics } from '@/utils/optics'

/** The field shown when the object has no FITS frames to take the camera's field from, degrees */
const DEFAULT_FIELD = { width: 0.6, height: 0.45 }

/** The longer side of the requested picture, pixels */
const LONG_SIDE = 1000

/**
 * A picture of the object's piece of the sky from the Digitized Sky Survey (DSS2, red plates),
 * cut out by NASA SkyView: the same field the observatory's camera sees when the optics are
 * known, else a default one. For objects without a processed photo of our own.
 *
 * @param ra - Right ascension, degrees
 * @param dec - Declination, degrees
 */
export const createSkySurveyUrl = (ra: number, dec: number, optics?: Optics | null): string => {
    const field = getFieldOfView(optics) ?? DEFAULT_FIELD
    // Within what the survey cut-out handles well: a few arcminutes to a few degrees
    const width = Math.min(Math.max(field.width, 0.1), 3)
    const height = Math.min(Math.max(field.height, 0.1), 3)
    const scale = LONG_SIDE / Math.max(width, height)

    const params = new URLSearchParams({
        Position: `${ra},${dec}`,
        Survey: 'DSS2 Red',
        Pixels: `${Math.round(width * scale)},${Math.round(height * scale)}`,
        Size: `${width.toFixed(4)},${height.toFixed(4)}`,
        Return: 'JPEG'
    })

    return `https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?${params.toString()}`
}
