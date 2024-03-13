import { ApiModel } from '@/api'

/* Item */
export interface ResItem extends ApiModel.Catalog {}

/* List */
export interface ResList {
    items?: ApiModel.Catalog[]
}

/* Set */
export interface ResSet extends ApiModel.Catalog {}

export interface ReqSet extends ApiModel.Catalog {}
