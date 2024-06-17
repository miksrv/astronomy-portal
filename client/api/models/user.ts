export type User = {
    id: string
    name: string
    email: string
    role?: 'user' | 'moderator' | 'admin'
    avatar?: string
    updated?: string
    created?: string
}
