import { APIMeteo } from '@/api/apiMeteo'
import { configureStore } from '@reduxjs/toolkit'
import { createWrapper } from 'next-redux-wrapper'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

import { API } from './api'
import applicationSlice from './applicationSlice'
import authSlice from './authSlice'

export const reducer = {
    application: applicationSlice,
    auth: authSlice,

    [API.reducerPath]: API.reducer,
    [APIMeteo.reducerPath]: APIMeteo.reducer
}

export const store = () =>
    configureStore({
        devTools: process.env.NODE_ENV !== 'production',
        middleware: (gDM) => gDM().concat(API.middleware, APIMeteo.middleware),
        reducer
    })

export type AppStore = ReturnType<typeof store>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export const wrapper = createWrapper<AppStore>(store, { debug: false })
