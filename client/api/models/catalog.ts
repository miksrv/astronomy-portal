/** An OpenNGC record (`GET /catalog/search`, `GET /catalog/:name`, `catalog` of `GET /objects/:name`) */
export interface CatalogItem {
    id: number
    /** The OpenNGC name, "NGC0598" */
    name: string
    /** The designation without leading zeros, "NGC598" */
    designation: string
    messier: number | null
    /** The OpenNGC type code: G, GCl, OCl, PN, HII, Neb, SNR, Cl+N, *Ass, RfN, EmN, DrkN, GPair, GTrpl, GGroup, *, **, Other, Nova */
    type: string
    /** J2000, degrees */
    ra: number
    dec: number
    /** The IAU three-letter abbreviation */
    constellation: string | null
    /** Arcminutes */
    majAxis: number | null
    minAxis: number | null
    posAngle: number | null
    magnitude: number | null
    surfBrightness: number | null
    hubble: string | null
    /** English common names */
    commonNames: string[]
    nameRu: string | null
    /** Our `objects` name ("M_33") when the observatory has shot it: the page is `/objects/<objectName>` */
    objectName: string | null
}

export interface CatalogDetails extends CatalogItem {
    aliases: string[]
}
