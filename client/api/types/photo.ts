import { ApiModel } from '@/api'

/* Item */
export interface ResItem extends ApiModel.Photo {}

/* List */
export interface ResList {
    items?: ApiModel.Photo[]
}

export interface ReqList {
    object?: string
    limit?: number
    order?: 'random' | keyof ApiModel.Photo
}

/* Set */
export interface ResSet extends ApiModel.Photo {}

export interface ReqSet {
    id: number
    object: string
    date: string
    author_id: number
    image_name: string
    image_ext: string
    filters?: ApiModel.Filter.ListItems
}

/* Upload */
export interface ResUpload {
    image_name: string
    image_ext: string
    image_size: number
}
