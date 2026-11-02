import { ApiModel } from '@/api'

/** One processing of the same object, for the history and the before/after slider */
export interface PhotoVersion {
    id: string
    /** `YYYY-MM-DD` */
    date?: string
    /** Medium-size image URL */
    src: string
    /** Large image URL */
    large: string
    width?: number
    height?: number
    /** Seconds */
    exposure?: number
    frames?: number
    filters?: ApiModel.Filters
}

/** One of our catalog's objects with its coordinates, to find it on a solved picture */
export interface PhotoSkyObject {
    name: string
    title: string
    /** Degrees */
    ra: number
    dec: number
}

/** What the photo page tells about the object on the picture */
export interface PhotoObjectSummary {
    name: string
    title: string
    /** The object's other designations, from the plate solve: "NGC 3031" for M 81 */
    aliases?: string[]
    ra?: number
    dec?: number
    constellation?: string
    categories?: number[]
    /** Seconds in the FITS archive */
    exposure?: number
    frames?: number
    nights?: number
    photosCount?: number
}
