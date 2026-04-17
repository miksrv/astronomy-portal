import { ApiModel } from '@/api'

export interface ReqList {
    entityType?: string
    entityId?: string
    userId?: string
}

export interface ResList {
    count: number
    items: ApiModel.Comment[]
    canReview?: boolean
    hasReviewed?: boolean
}

export interface ReqRandom {
    entityType: string
    limit?: number
}

export interface ResRandom {
    items: ApiModel.Comment[]
}

export interface ReqCreate {
    entityType: string
    entityId: string
    content: string
    rating?: number
}
