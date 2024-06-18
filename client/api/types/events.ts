import { ApiModel } from '@/api'

/* List */
export interface ResList {
    items?: ApiModel.Event[]
}

/* Registration */
export interface ReqRegistration {
    event: string
    user: number
    adults?: number
    children?: number
}

export interface ResRegistration {
    result: boolean
    message?: string
}
