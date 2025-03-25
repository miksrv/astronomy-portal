import { ApiModel } from '@/api'

export interface ResList {
    items?: ApiModel.Event[]
}

export type ResItem = ApiModel.Event

export type ResponsePhoto = ApiModel.EventPhoto

export interface RequestPhotoList {
    eventId?: string
    limit?: number
    order?: 'date' | 'rand'
}

export interface ResponsePhotoList {
    count?: number
    items?: ApiModel.EventPhoto[]
}

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
