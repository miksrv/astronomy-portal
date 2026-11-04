import { ApiModel } from '@/api'

export interface ReqSearch {
    q: string
    limit?: number
}

export interface ResSearch {
    items: ApiModel.CatalogItem[]
}
