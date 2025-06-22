import { deleteCookie, setCookie } from 'cookies-next'

import { ApiModel, ApiType } from '@/api'
import * as LocalStorage from '@/tools/localstorage'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type InitialStateProps = {
    isAuth?: boolean
    error?: any
    token?: string
    user?: ApiModel.User
}

export const getStorageToken = (): string | undefined =>
    typeof window !== 'undefined' && LocalStorage.getItem('AUTH_TOKEN')
        ? (LocalStorage.getItem('AUTH_TOKEN') ?? '')
        : ''

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
                setCookie('token', payload.token)
            } else {
                LocalStorage.removeItem('AUTH_TOKEN')
                deleteCookie('token')
            }
        },
        logout: (state) => {
            state.token = ''
            state.user = undefined
            state.isAuth = false

            LocalStorage.removeItem('AUTH_TOKEN')
            deleteCookie('token')
        }
    }
})

export const { login, logout, setSSRToken } = authSlice.actions

export default authSlice.reducer
