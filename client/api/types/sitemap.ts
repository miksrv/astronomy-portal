import { ApiModel } from '@/api'

export interface Response {
    photos?: ApiModel.SiteMap[]
    objects?: ApiModel.SiteMap[]
    events?: ApiModel.SiteMap[]
}
