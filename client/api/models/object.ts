import { ApiModel, ApiType } from '@/api'

export type Object = {
    name: string
    title: string
    image?: string
    fitsCloudLink?: string
    description?: string
    categories?: number[]
    equipment?: number[]
    ra?: number
    dec?: number
    updated?: ApiType.DateTime
    statistic?: ApiModel.Statistic
    filters?: ApiModel.Filters
}
