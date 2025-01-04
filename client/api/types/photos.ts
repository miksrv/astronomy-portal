import { ApiModel } from '@/api'

export interface PostResponse {
    result?: boolean
}

export interface Response {
    count?: number
    items?: ApiModel.Photo[]
}

export interface PostRequest {
    id?: string
    categories?: number[]
    objects?: string[]
    equipment?: number[]
    date?: string
    filters?: ApiModel.Filters
    upload?: FormData
}

export interface Request {
    object?: string
    limit?: number
    order?: 'random' | keyof ApiModel.Photo
}

export interface PostUploadRequest {
    id?: string
    file?: FormData
}
