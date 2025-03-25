import { ApiModel } from '@/api'

export type Request = object

export interface Response {
    count?: number
    items: ApiModel.Equipment[]
}
