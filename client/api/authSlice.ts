import { PayloadAction, createSlice } from '@reduxjs/toolkit'

import { APIResponseLogin, TUserInfo } from './types'

export const ACCESS_TOKEN_KEY = 'AstroAuthToken'

type InitialStateProps = {
    isAuth?: boolean
    error?: any
    token?: string
    user?: TUserInfo
}

export const getStorageToken = (): string | undefined =>
    typeof window !== 'undefined' && localStorage.getItem(ACCESS_TOKEN_KEY)
        ? localStorage.getItem(ACCESS_TOKEN_KEY) ?? ''
        : ''

const authSlice = createSlice({
    extraReducers: {},
    initialState: {
        token: getStorageToken()
    } as InitialStateProps,
    name: 'auth',
    reducers: {
        login: (state, { payload }: PayloadAction<APIResponseLogin>) => {
            state.user = payload?.user || undefined
            state.token = payload?.token || ''
            state.isAuth = true

            if (payload?.auth && !!payload?.token) {
                localStorage.setItem(ACCESS_TOKEN_KEY, payload?.token || '')
            } else {
                localStorage.setItem(ACCESS_TOKEN_KEY, '')
            }
        },
        logout: (state) => {
            state.token = ''
            state.user = undefined
            state.isAuth = false

            localStorage.setItem(ACCESS_TOKEN_KEY, '')
        }
    }
})

export const { login, logout } = authSlice.actions

export default authSlice.reducer
