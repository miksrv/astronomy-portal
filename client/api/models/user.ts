export type User = {
    id: string
    name: string
    email: string
    phone?: string
    role?: UserRole
    avatar?: string
    updated?: string
    created?: string
}

export enum UserRole {
    USER = 'user',
    SECURITY = 'security',
    MODERATOR = 'moderator',
    ADMIN = 'admin'
}

export type UserAuthType = 'google' | 'yandex' | 'vk' | 'native'

export interface AdminUserItem {
    id: string
    name: string
    avatar?: string
    role: UserRole
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
    date: string
    adults: number
    children: number
    checkinAt?: string
    registeredAt: string
}
