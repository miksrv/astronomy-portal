import { configureStore } from '@reduxjs/toolkit'
import { createWrapper } from 'next-redux-wrapper'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

import loginModalSlice from '@/components/login-modal/loginModalSlice'
import sidebarSlice from '@/components/sidebar/sidebarSlice'

import { API } from './api'
import applicationSlice from './applicationSlice'
import authSlice from './authSlice'

export const reducers = {
    application: applicationSlice,
    auth: authSlice,
    loginModal: loginModalSlice,
    sidebar: sidebarSlice,

    [API.reducerPath]: API.reducer
}

export const store = () =>
    configureStore({
        middleware: (gDM) => gDM().concat(API.middleware),
        reducer: reducers
    })

export type AppStore = ReturnType<typeof store>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export const wrapper = createWrapper<AppStore>(store, { debug: false })
