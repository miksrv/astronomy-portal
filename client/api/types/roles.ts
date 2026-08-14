import { ApiModel } from '@/api'

export interface RolesListResponse {
    items: ApiModel.Role[]
}

export interface RolePermissionsResponse {
    items: ApiModel.Permission[]
}

export interface RoleCreateRequest {
    name: string
    permissions: ApiModel.Permission[]
}

export interface RoleUpdateRequest {
    id: number
    name?: string
    permissions?: ApiModel.Permission[]
}
