import { ApiModel, ApiType } from '@/api'

export type File = {
    filter: ApiModel.FilterTypes
    fileName?: string
    exposure?: number
    gain?: number
    offset?: number
    ccdTemp?: number
    date?: ApiType.DateTime
}
