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

/** What the photo page tells about the object on the picture */
export interface PhotoObjectSummary {
    name: string
    title: string
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
