import { ApiModel } from '@/api'

export type UsersSortBy = 'name' | 'activityAt' | 'createdAt' | 'eventsCount'
export type UsersSortDir = 'asc' | 'desc'

export interface UsersListRequest {
    page?: number
    limit?: number
    search?: string
    role?: ApiModel.UserRole | ''
    authType?: ApiModel.UserAuthType | ''
    sortBy?: UsersSortBy
    sortDir?: UsersSortDir
}

export interface UsersListResponse {
    count: number
    page: number
    totalPages: number
    items: ApiModel.AdminUserItem[]
}

export interface UserEventsResponse {
    items: ApiModel.AdminUserEvent[]
}
