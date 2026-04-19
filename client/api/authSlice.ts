import { deleteCookie, setCookie } from 'cookies-next'

import { createSlice, PayloadAction, SerializedError } from '@reduxjs/toolkit'

import { ApiModel, ApiType } from '@/api'
import * as LocalStorage from '@/utils/localstorage'

type InitialStateProps = {
    isAuth?: boolean
    error?: SerializedError | null
    token?: string
    user?: ApiModel.User
}

export const getStorageToken = (): string | undefined => {
    const token = typeof window !== 'undefined' ? LocalStorage.getItem('AUTH_TOKEN') : undefined
    return token ?? ''
}

const authSlice = createSlice({
    initialState: {
        token: getStorageToken()
    } as InitialStateProps,
    name: 'auth',
    reducers: {
        setSSRToken: (state, { payload }: PayloadAction<string | undefined>) => {
            state.token = payload || ''
        },
        login: (state, { payload }: PayloadAction<ApiType.Auth.ResLogin>) => {
            state.user = payload?.user || undefined
            state.token = payload?.token || ''
            state.isAuth = true

            if (payload?.auth && !!payload?.token) {
                LocalStorage.setItem('AUTH_TOKEN', payload.token)
                void setCookie('token', payload.token, { maxAge: 15552000 })
            } else {
                LocalStorage.removeItem('AUTH_TOKEN')
                void deleteCookie('token')
            }
        },
        logout: (state) => {
            state.token = ''
            state.user = undefined
            state.isAuth = false

            LocalStorage.removeItem('AUTH_TOKEN')
            void deleteCookie('token')
        }
    }
})

export const { login, logout, setSSRToken } = authSlice.actions

export default authSlice.reducer
