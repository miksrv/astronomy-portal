import { Wcs } from '@/utils/wcs'

/** One object nova.astrometry.net found on the solved picture, in the solved file's pixels */
export interface AstrometryAnnotation {
    /** `messier`, `ngc`, `ic`, `bright` (named stars), `hd`, `hip`, `tycho2`, … */
    type: string
    names: string[]
    pixelx: number
    pixely: number
    radius: number
    vmag?: number
}

export type AstrometryStatus = 'pending' | 'solving' | 'success' | 'failed'

/** The plate solve of a photo (`GET /photos/:id/astrometry`) */
export interface PhotoAstrometry {
    photoId: string
    status: AstrometryStatus
    error?: string | null
    jobId?: number | null
    /** The solved file's size: the WCS and the annotations are in its pixels */
    solvedWidth?: number | null
    solvedHeight?: number | null
    /** The picture's centre, degrees */
    ra?: number | null
    dec?: number | null
    /** Degrees */
    radius?: number | null
    /** Arcseconds per pixel of the solved file */
    pixscale?: number | null
    /** Degrees, east of north */
    orientation?: number | null
    parity?: number | null
    wcs?: Wcs | null
    annotations?: AstrometryAnnotation[] | null
    solvedAt?: string | null
}

/** A solve with its numbers: the only kind the UI draws */
export interface SolvedAstrometry extends PhotoAstrometry {
    status: 'success'
    solvedWidth: number
    solvedHeight: number
    ra: number
    dec: number
    pixscale: number
    orientation: number
}

export const isSolved = (astrometry?: PhotoAstrometry | null): astrometry is SolvedAstrometry =>
    astrometry?.status === 'success' &&
    typeof astrometry.solvedWidth === 'number' &&
    typeof astrometry.solvedHeight === 'number' &&
    typeof astrometry.ra === 'number' &&
    typeof astrometry.dec === 'number' &&
    typeof astrometry.pixscale === 'number' &&
    typeof astrometry.orientation === 'number'
