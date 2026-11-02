/** A photo of the object, as the object page shows it */
export interface ObjectPagePhoto {
    id: string
    /** The shooting date, `YYYY-MM-DD` */
    date?: string
    /** Medium-size image URL (500 px): tiles */
    src: string
    /** Full-size image URL: the hero, resized by next/image */
    large: string
}

/** Another object to link to: same category */
export interface RelatedObject {
    name: string
    title: string
}
