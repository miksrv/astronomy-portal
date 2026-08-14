import { ApiModel } from '@/api'

/**
 * Whether the given user has the given privilege. There is no admin
 * bypass on the frontend either — mirrors the backend's SessionLibrary::can(),
 * which checks the flat `permissions` list `/auth/me` returns (the union of
 * every role the user is assigned).
 */
export const hasPermission = (
    user: Pick<ApiModel.User, 'permissions'> | undefined,
    permission: ApiModel.Permission
): boolean => !!user?.permissions?.includes(permission)

/** True if the user has at least one of the given privileges. */
export const hasAnyPermission = (
    user: Pick<ApiModel.User, 'permissions'> | undefined,
    permissions: ApiModel.Permission[]
): boolean => permissions.some((permission) => hasPermission(user, permission))
