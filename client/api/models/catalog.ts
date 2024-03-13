import { ApiModel } from '@/api'

export type Catalog = {
    name: string
    title: string
    text: string
    image?: string
    updated?: string
    category?: number
    category_name?: string
    source_link?: string
    coord_ra?: number
    coord_dec?: number
    statistic?: ApiModel.File.Statistic
    filters?: ApiModel.Filter.ListItems
    files?: ApiModel.File.Item[]
}
