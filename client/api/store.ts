import { api } from '@/api/api'
import { configureStore } from '@reduxjs/toolkit'
import { createWrapper } from 'next-redux-wrapper'

import loginFormSlice from '@/components/login-form/loginFormSlice'
import sidebarSlice from '@/components/sidebar/sidebarSlice'

import applicationSlice from './applicationSlice'
import authSlice from './authSlice'

export const store = () =>
    configureStore({
        middleware: (gDM) => gDM().concat(api.middleware),
        reducer: {
            application: applicationSlice,
            auth: authSlice,
            loginForm: loginFormSlice,
            sidebar: sidebarSlice,

            [api.reducerPath]: api.reducer
        }
    })

export type AppStore = ReturnType<typeof store>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']

export const wrapper = createWrapper<AppStore>(store, { debug: true })
