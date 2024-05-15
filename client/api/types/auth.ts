import { ApiModel } from '@/api'

export type AuthServiceType = 'google' | 'yandex' | 'native'

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
}

export interface ResAuthService {
    session?: string
    redirect?: string
    token?: string
    auth?: boolean
    user?: ApiModel.User
}
