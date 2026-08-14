import { Permission } from './permission'
import { Role } from './role'

export type User = {
    id: string
    name: string
    email: string
    phone?: string
    birthday?: string
    sex?: 'm' | 'f'
    /** Role names, for display only — never used for access checks. */
    roles?: string[]
    /** Flat, deduplicated union of every privilege the user's roles grant. Use `hasPermission()` (client/utils/permissions.ts), not a direct `.includes()`. */
    permissions?: Permission[]
    avatar?: string
    updated?: string
    created?: string
}

export type UserAuthType = 'google' | 'yandex' | 'vk' | 'native'

export interface AdminUserItem {
    id: string
    name: string
    avatar?: string
    roles: Role[]
    authType: UserAuthType
    locale: string
    sex?: 'm' | 'f'
    age?: number
    activityAt?: string
    createdAt: string
    eventsCount: number
}

export interface AdminUserEvent {
    id: string
    title: string
    location?: string
    date: string
    coverFileName?: string
    coverFileExt?: string
    adults: number
    children: number
    checkinAt?: string
    registeredAt: string
}
