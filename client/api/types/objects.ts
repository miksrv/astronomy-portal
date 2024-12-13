import { ApiModel } from '@/api'

export interface Request extends ApiModel.Object {}

export interface Response {
    count?: number
    items: ApiModel.Object[]
}
