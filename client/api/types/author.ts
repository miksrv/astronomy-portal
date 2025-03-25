import { ApiModel } from '@/api'

/* List */
export interface ResList {
    items?: ApiModel.Author[]
}

/* Set */
export type ResSet = ApiModel.Author

export type ReqSet = ApiModel.Author
