import { ApiModel, ApiType } from '@/api'

export type Object = {
    name: string
    title: string
    description?: string
    categories?: number[]
    ra?: number
    dec?: number
    updated?: ApiType.DateTime
    statistic?: ApiModel.Statistic
    filters?: ApiModel.Filters
}
