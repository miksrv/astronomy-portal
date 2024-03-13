import { ApiModel } from '@/api'

/* General */
export interface ResGeneral {
    photos: number
    objects: number
    frames: number
    exposure: number
    filesize: number
}

/* Telescope */
export interface ResTelescope {
    count: number
    items: ApiModel.Statistic.Telescope[]
}

export interface ReqTelescope {
    period?: string
}

/* Photo */
export interface ResPhotoNames {
    items: string[]
}

/* Catalog */
export interface ResCatalogNames {
    items: string[]
}
