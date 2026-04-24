import { ApiType } from '@/api'

export type MailingStatus = 'draft' | 'sending' | 'completed' | 'paused'

export interface Mailing {
    id: string
    subject: string
    content: string
    image?: string
    status: MailingStatus
    totalCount: number
    sentCount: number
    errorCount: number
    createdBy: string
    sentAt?: ApiType.DateTime | null
    createdAt: ApiType.DateTime
    updatedAt: ApiType.DateTime
    limitDay: number
    limitHour: number
    sentToday: number
    sentThisHour: number
}

export interface MailingListItem {
    id: string
    subject: string
    status: MailingStatus
    totalCount: number
    sentCount: number
    errorCount: number
    createdAt: ApiType.DateTime
    sentAt?: ApiType.DateTime | null
}

export interface CreateMailingRequest {
    subject: string
    content: string
}

export interface UpdateMailingRequest {
    subject?: string
    content?: string
}
