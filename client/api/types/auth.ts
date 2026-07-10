import { ApiModel } from '@/api'

export type AuthServiceType = ApiModel.UserAuthType

export interface ResLogin {
    message?: string
    user?: ApiModel.User
    token?: string
    auth?: boolean
}

export interface ReqLogin {
    email: string
    password: string
}

export interface ReqAuthService {
    service: AuthServiceType
    code?: string
    device_id?: string
    state?: string
}

export interface ResAuthService {
    session?: string
    redirect?: string
    token?: string
    auth?: boolean
    user?: ApiModel.User
}

export interface ReqUpdateProfile {
    name: string
    phone?: string
    birthday?: string
    sex?: 'm' | 'f'
}

export interface ResUpdateProfile {
    user: ApiModel.User
}

export interface ReqMagicLinkRequest {
    email: string
    returnPath?: string
}

export interface ResMagicLinkRequest {
    sent: boolean
}

export interface ReqMagicLinkVerify {
    token: string
}

export interface ResMagicLinkVerify extends ResLogin {
    isNewUser?: boolean
}

export interface ResUpcomingEvent {
    item: ApiModel.Event | null
}

export interface ResLogout {
    success: boolean
}
