import { ApiModel } from '@/api'

/* List */
export interface ResList {
    items?: ApiModel.Event[]
}

/* Registration */
export interface ReqRegistration {
    eventId: string
    adults?: number
    children?: number
    name?: string
    phone?: string
}

export interface ResRegistration {
    result: boolean
    message?: string
}
