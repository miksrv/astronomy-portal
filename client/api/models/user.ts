export type User = {
    id: string
    name: string
    email: string
    phone?: string
    role?: 'user' | 'moderator' | 'admin'
    avatar?: string
    updated?: string
    created?: string
}
