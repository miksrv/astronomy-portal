import { ApiModel } from '@/api'

export type Photo = {
    id: number
    object: string
    date: string
    author?: ApiModel.Author
    image_name: string
    image_ext: string
    image_size: number
    image_width: number
    image_height: number
    custom?: boolean
    statistic: ApiModel.File.Statistic
    filters: ApiModel.Filter.ListItems
}
