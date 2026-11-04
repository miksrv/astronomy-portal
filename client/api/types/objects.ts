import { ApiModel } from '@/api'

export type Request = ApiModel.Object & {
    /** What the editor looked up in SIMBAD in the form, stored with the object */
    simbad?: SimbadFacts | null
}

/** `GET /objects/simbad/:name`: SIMBAD's answer for a name, nothing stored */
export interface SimbadFacts {
    simbadId: string
    /** J2000, degrees */
    ra: number
    dec: number
    type: string | null
    /** Arcminutes */
    majAxis: number | null
    minAxis: number | null
    /** V magnitude; null for a nebula (SIMBAD's would be its central star's) */
    magnitude: number | null
    aliases: string[]
}

export interface Response {
    count?: number
    items: ApiModel.Object[]
}
