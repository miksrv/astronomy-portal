import { ApiModel } from '@/api'

/* List */
export interface ResList {
    items: ApiModel.Category[]
}

/* Set */
export interface ResSet extends ApiModel.Category {}

export interface ReqSet extends ApiModel.Category {}
