import { ApiModel } from '@/api'

export type UsersSortBy = 'name' | 'activityAt' | 'createdAt' | 'eventsCount'
export type UsersSortDir = 'asc' | 'desc'

export interface UsersListRequest {
    page?: number
    limit?: number
    search?: string
    /** Comma-separated role ids — matches a user holding ANY of them (a user can hold several roles at once). */
    roleIds?: string
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

export interface UsersUpdateRolesRequest {
    id: string
    roleIds: number[]
}
