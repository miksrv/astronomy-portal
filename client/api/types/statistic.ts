import { ApiModel } from '@/api'

/* Telescope */
export interface ResTelescope {
    count: number
    items: ApiModel.Telescope[]
}

export interface ReqTelescope {
    period?: string
}

/* Stargazing */
export interface ResStargazing {
    events: number
    members: number
}
