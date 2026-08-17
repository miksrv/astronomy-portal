import { ApiType } from '@/api'
import { PushAudienceType } from '@/api/types/push'

export type PushNotificationStatus = 'draft' | 'sending' | 'completed' | 'paused'

export interface PushNotification {
    id: string
    title: string
    body: string
    icon?: string | null
    url?: string | null
    status: PushNotificationStatus
    audienceType?: PushAudienceType
    audienceEventId?: string | null
    audienceLabelRu?: string
    audienceLabelEn?: string
    audienceCount?: number
    totalCount: number
    sentCount: number
    errorCount: number
    createdBy?: string
    sentAt?: ApiType.DateTime | null
    createdAt: ApiType.DateTime
    updatedAt: ApiType.DateTime
}

export interface PushNotificationListItem {
    id: string
    title: string
    status: PushNotificationStatus
    totalCount: number
    sentCount: number
    errorCount: number
    createdAt: ApiType.DateTime
    sentAt?: ApiType.DateTime | null
}

export interface CreatePushNotificationRequest {
    title: string
    body: string
    url?: string
    audienceType?: PushAudienceType
    audienceEventId?: string | null
}

export interface UpdatePushNotificationRequest {
    title?: string
    body?: string
    url?: string
    audienceType?: PushAudienceType
    audienceEventId?: string | null
}
