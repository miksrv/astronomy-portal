import { Telescope } from '@/api/models/statistic'

/* Telescope */
export interface ResTelescope {
    count: number
    items: Telescope[]
}

export interface ReqTelescope {
    period?: string
}
