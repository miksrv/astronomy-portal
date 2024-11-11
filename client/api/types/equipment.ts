import { ApiModel } from '@/api'

export interface Request {}

export interface Response {
    count?: number
    items: ApiModel.Equipment[]
}
