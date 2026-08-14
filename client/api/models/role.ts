import { Permission } from './permission'

export interface Role {
    id: number
    name: string
    permissions: Permission[]
    /** How many users currently have this role — only present in the `/roles` list response. */
    usersCount?: number
}
