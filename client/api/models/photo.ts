import { ApiModel, ApiType } from '@/api'

export type Photo = {
    id: string
    date?: string
    objects?: string[]
    categories?: number[]
    equipments?: number[]
    dirName?: string
    fileName?: string
    fileExt?: string
    fileSize?: number
    imageWidth?: number
    imageHeight?: number
    updated?: ApiType.DateTime
    statistic?: ApiModel.Statistic
    filters?: ApiModel.Filters
}
