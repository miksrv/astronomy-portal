import { ApiModel, ApiType } from '@/api'
import { Optics } from '@/utils/optics'

/** The newest photo of an object: its cover in the catalog (`GET /objects`) */
export interface ObjectCover {
    id: string
    date?: string
    dirName: string
    fileName: string
    fileExt: string
}

export interface Object {
    name: string
    title: string
    image?: string
    fitsCloudLink?: string
    description?: string
    categories?: number[]
    equipment?: number[]
    ra?: number
    dec?: number
    /** Distance in light years, filled in by an editor */
    distance?: number | null
    /** Apparent visual magnitude: the editor's, or SIMBAD's when the editor left it empty */
    magnitude?: number | null
    /** Observing nights with at least one FITS frame (a night runs from local noon to noon) */
    nights?: number
    /** The first and the last observing night, `YYYY-MM-DD` */
    firstNight?: string
    lastNight?: string
    /** The optical train most frames were taken with, from the FITS headers (`GET /objects/:name` only) */
    optics?: Optics | null
    /** `GET /objects` only */
    photosCount?: number
    /** `GET /objects` only */
    cover?: ObjectCover
    updated?: ApiType.DateTime
    statistic?: ApiModel.Statistic
    filters?: ApiModel.Filters
    /**
     * What SIMBAD knows (`GET /objects/:name` only; null until the object was looked up): its main
     * identifier, the type as SIMBAD's short code (`G`, `GlC`, `HII`…), the size in arcminutes and
     * the other names ("NGC 598", "Triangulum Galaxy")
     */
    simbadId?: string | null
    type?: string | null
    majAxis?: number | null
    minAxis?: number | null
    aliases?: string[]
}
