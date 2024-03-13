import { ApiModel } from '@/api'

/* List */
export interface ResList {
    items?: ApiModel.Author[]
}

/* Set */
export interface ResSet extends ApiModel.Author {}

export interface ReqSet extends ApiModel.Author {}
