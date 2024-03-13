import { ApiModel } from '@/api'

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
