import * as LocalStorage from '@/tools/localstorage'
import { ApiModel, ApiType } from '@/api'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'

type InitialStateProps = {
    isAuth?: boolean
    error?: any
    token?: string
    user?: ApiModel.User
}

export const getStorageToken = (): string | undefined =>
    typeof window !== 'undefined' && LocalStorage.getItem('AUTH_TOKEN')
        ? LocalStorage.getItem('AUTH_TOKEN') ?? ''
        : ''

const authSlice = createSlice({
    initialState: {
        token: getStorageToken()
    } as InitialStateProps,
    name: 'auth',
    reducers: {
        login: (state, { payload }: PayloadAction<ApiType.Auth.ResLogin>) => {
            state.user = payload?.user || undefined
            state.token = payload?.token || ''
            state.isAuth = true

            if (payload?.auth && !!payload?.token) {
                LocalStorage.setItem('AUTH_TOKEN', payload.token)
            } else {
                LocalStorage.removeItem('AUTH_TOKEN')
            }
        },
        logout: (state) => {
            state.token = ''
            state.user = undefined
            state.isAuth = false

            LocalStorage.removeItem('AUTH_TOKEN')
        }
    }
})

export const { login, logout } = authSlice.actions

export default authSlice.reducer
