import { ApiModel } from '@/api'

export interface ResList {
    items?: ApiModel.Event[]
}

export interface ResItem extends ApiModel.Event {}

export interface ResUploadPhoto extends ApiModel.EventPhoto {}

export interface ReqUploadPhoto {
    formData?: FormData
    eventId?: string
}

/* Registration */
export interface ReqRegistration {
    eventId: string
    adults?: number
    children?: number
    name?: string
    phone?: string
    childrenAges?: number[]
}

export interface ResRegistration {
    result: boolean
    message?: string
}
