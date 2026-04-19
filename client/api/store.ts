import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

import { createWrapper, HYDRATE } from 'next-redux-wrapper'
// AnyAction is needed here because the HYDRATE handler directly accesses action.payload
// properties at runtime; UnknownAction breaks configureStore's Reducer type compatibility.
import { AnyAction, combineReducers, configureStore } from '@reduxjs/toolkit'

import { APIMeteo } from '@/api/apiMeteo'

import { API } from './api'
import applicationSlice from './applicationSlice'
import authSlice from './authSlice'

// 1. Combine all reducers
const combinedReducer = combineReducers({
    application: applicationSlice,
    auth: authSlice,
    [API.reducerPath]: API.reducer,
    [APIMeteo.reducerPath]: APIMeteo.reducer
})

// 2. Process HYDRATE separately
type RootReducerState = ReturnType<typeof combinedReducer>

const rootReducer = (state: RootReducerState | undefined, action: AnyAction) => {
    if (action.type === HYDRATE) {
        // next-redux-wrapper guarantees payload matches RootReducerState; any is needed
        // because spreading Partial<CombinedState> makes queries optional, breaking configureStore.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = action.payload
        return {
            ...state, // old client state

            // application can be hydrated
            application:
                payload.application ?? state?.application ?? combinedReducer(undefined, { type: '' }).application,

            // DO NOT touch auth if there is nothing in payload
            auth:
                payload.auth?.token || payload.auth?.isAuth
                    ? payload.auth
                    : (state?.auth ?? combinedReducer(undefined, { type: '' }).auth),

            [API.reducerPath]: {
                ...state?.[API.reducerPath],
                ...payload[API.reducerPath]
            },
            [APIMeteo.reducerPath]: {
                ...state?.[APIMeteo.reducerPath],
                ...payload[APIMeteo.reducerPath]
            }
        }
    }

    return combinedReducer(state, action)
}

// 3. Configure the store
export const makeStore = () =>
    configureStore({
        reducer: rootReducer,
        devTools: process.env.NODE_ENV !== 'production',
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(API.middleware, APIMeteo.middleware)
    })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export const wrapper = createWrapper<AppStore>(makeStore, { debug: false })
