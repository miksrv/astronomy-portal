import { ApiModel } from '@/api'

export type Request = ApiModel.Object

export interface Response {
    count?: number
    items: ApiModel.Object[]
}
