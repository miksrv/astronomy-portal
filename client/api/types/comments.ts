import { ApiModel } from '@/api'

export interface ReqList {
    entityType?: string
    entityId?: string
    userId?: string
    offset?: number
    limit?: number
}

/** The headline rating: how many reviews carry a rating and their average (null without any) */
export interface RatingSummary {
    count: number
    average: number | null
}

export interface ResList {
    total: number
    items: ApiModel.Comment[]
    summary?: RatingSummary
    canReview?: boolean
    hasReviewed?: boolean
}

export interface ReqRandom {
    entityType: string
    limit?: number
    /** Only reviews rated at least this (1–5) */
    minRating?: number
    /** Only reviews at least this many characters long */
    minLength?: number
}

export interface ResRandom {
    items: ApiModel.Comment[]
    /** The rating of the whole entity type, every review counted */
    summary?: RatingSummary
}

export interface ReqCreate {
    entityType: string
    entityId: string
    content: string
    rating?: number
}
