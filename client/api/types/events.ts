import { ApiModel, ApiType } from '@/api'

export interface ResList {
    items?: ApiModel.Event[]
}

export type ResItem = ApiModel.Event

export type ResPhoto = ApiModel.EventPhoto

export type ResCheckin = Pick<ApiModel.Event, 'members'> & {
    checkin?: ApiType.DateTime
}

export type EventFormType = Partial<
    Omit<ApiModel.Event, 'date' | 'availableTickets' | 'registrationStart' | 'registrationEnd'>
> & {
    date?: string
    registrationStart?: string
    registrationEnd?: string
    tickets?: string
    upload?: File
}

/* Photo List */
export interface ReqPhotoList {
    eventId?: string
    limit?: number
    order?: 'date' | 'rand'
}

export interface ResPhotoList {
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

/* Users List */
export interface ResUsersList {
    count?: number
    items?: ApiModel.EventUser[]
}

/* Cover */
export interface ReqUpdateCover {
    id: string
    formData: FormData
}

export interface ResUpdateCover {
    coverFileName: string
    coverFileExt: string
}
