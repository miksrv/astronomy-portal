/** The optical train of a set of frames, as `GET /objects/:name` reports it from the FITS headers */
export interface Optics {
    /** mm */
    focalLength?: number | null
    /** mm */
    aperture?: number | null
    /** µm, after binning */
    pixelSize?: number | null
    /** Sensor size in pixels, after binning */
    width?: number | null
    height?: number | null
    binning?: number | null
    /** Arcseconds per pixel, as the capture software wrote it */
    scale?: number | null
    frames?: number
}

export interface FieldOfView {
    /** Arcseconds per pixel */
    scale: number
    /** Degrees */
    width: number
    height: number
}

/** Focal ratio "f/5" from focal length and aperture */
export const getFocalRatio = (optics?: Optics | null): number | undefined =>
    optics?.focalLength && optics.aperture ? optics.focalLength / optics.aperture : undefined

/**
 * The plate scale and the field the sensor sees. The scale comes from the header when the
 * capture software wrote it, else from 206.265 × pixel / focal length.
 */
export const getFieldOfView = (optics?: Optics | null): FieldOfView | undefined => {
    if (!optics?.width || !optics.height) {
        return undefined
    }

    const scale =
        optics.scale || (optics.pixelSize && optics.focalLength ? (206.265 * optics.pixelSize) / optics.focalLength : 0)

    if (!scale) {
        return undefined
    }

    return {
        scale,
        width: (optics.width * scale) / 3600,
        height: (optics.height * scale) / 3600
    }
}

/** Degrees for people: "1.01°" over one degree, "46′" under it */
export const formatAngle = (degrees: number, locale: string = 'ru'): string => {
    const minutes = degrees * 60

    return degrees >= 1
        ? `${degrees.toLocaleString(locale, { maximumFractionDigits: 2 })}°`
        : `${Math.round(minutes).toLocaleString(locale)}′`
}

/**
 * The sky a published picture covers, assuming its pixels are the sensor's: a crop of the
 * stacked frame, the usual case. `undefined` when the picture can't be such a crop - larger
 * than the sensor (drizzle, a mosaic) or much smaller (resized, or shot with other gear).
 */
export const getImageField = (
    imageWidth?: number,
    imageHeight?: number,
    optics?: Optics | null
): FieldOfView | undefined => {
    const sensor = getFieldOfView(optics)

    if (!sensor || !imageWidth || !imageHeight || !optics?.width || !optics.height) {
        return undefined
    }

    const sensorLong = Math.max(optics.width, optics.height)
    const sensorShort = Math.min(optics.width, optics.height)
    const imageLong = Math.max(imageWidth, imageHeight)
    const imageShort = Math.min(imageWidth, imageHeight)

    if (imageLong > sensorLong * 1.02 || imageShort > sensorShort * 1.02 || imageLong < sensorLong * 0.5) {
        return undefined
    }

    return {
        scale: sensor.scale,
        width: (imageWidth * sensor.scale) / 3600,
        height: (imageHeight * sensor.scale) / 3600
    }
}

/** Round lengths a scale bar may show, degrees: 1′ … 5° */
const SCALE_BAR_STEPS = [1 / 60, 2 / 60, 5 / 60, 10 / 60, 15 / 60, 0.5, 1, 2, 5]

/**
 * The longest round angle that fits a scale bar of at most `maxPx` screen pixels
 *
 * @param degreesPerPx - How much sky one screen pixel shows
 */
export const pickScaleBar = (degreesPerPx: number, maxPx: number): { px: number; degrees: number } | undefined => {
    if (!(degreesPerPx > 0) || !(maxPx > 0)) {
        return undefined
    }

    const degrees = [...SCALE_BAR_STEPS].reverse().find((step) => step / degreesPerPx <= maxPx)

    return degrees ? { px: degrees / degreesPerPx, degrees } : undefined
}
