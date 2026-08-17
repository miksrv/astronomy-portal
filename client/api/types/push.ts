import { ApiModel } from '@/api'

/* Push subscription (user-facing) */
export interface PushSubscriptionKeys {
    p256dh: string
    auth: string
}

export interface ReqPushSubscribe {
    endpoint: string
    keys: PushSubscriptionKeys
    userAgent?: string
}

export interface ReqPushUnsubscribe {
    endpoint: string
}

export interface ResVapidKey {
    publicKey: string
}

/* Push notifications (admin campaigns) */
export type PushAudienceType = 'all' | 'event'

export interface PushAudience {
    type: PushAudienceType
    eventId: string | null
    labelRu: string
    labelEn: string
    count: number
}

export interface ResPushAudiences {
    items: PushAudience[]
}

export interface ResPushList {
    items: ApiModel.PushNotificationListItem[]
    count: number
}

export interface ReqPushUpload {
    id: string
    formData: FormData
}

export interface ResPushUpload {
    icon: string
}

export interface ResPushTestSend {
    success: boolean
    sent: number
    failed: number
}

export interface ResPushLaunch {
    queued: number
}
