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
