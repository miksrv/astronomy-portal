import { ApiModel } from '@/api'

/* Mailings */
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
