import { ApiModel } from '@/api'

/* Mailings */
export type MailingAudienceType = 'all' | 'event'

export interface MailingAudience {
    type: MailingAudienceType
    eventId: string | null
    labelRu: string
    labelEn: string
    count: number
}

export interface ResMailingAudiences {
    items: MailingAudience[]
}

export interface ResMailingList {
    items: ApiModel.MailingListItem[]
    count: number
}

export interface ReqMailingUpload {
    id: string
    formData: FormData
}

export interface ResMailingUpload {
    image: string
}

export interface ResMailingTestSend {
    success: boolean
}

export interface ResMailingLaunch {
    queued: number
}

export interface ResMailingUnsubscribe {
    success: boolean
    message: string
}
