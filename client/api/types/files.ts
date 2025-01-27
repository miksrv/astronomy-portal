import { ApiModel } from '@/api'

export interface Response {
    count?: number
    items: ApiModel.File[]
}
