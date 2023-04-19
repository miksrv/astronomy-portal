import { PayloadAction, createSlice } from '@reduxjs/toolkit'

import { APIResponseLogin, TUserInfo } from './types'

//
// export const authSlice = createSlice({
//     initialState: { status: false, token: '' } as IRestAuth,
//     name: 'auth',
//     reducers: {
//         setCredentials: (
//             state,
//             { payload: { status, token } }: PayloadAction<IRestAuth>
//         ) => {
//             state.status = status
//             state.token = token
//         }
//     }
// })
//
// export const { setCredentials } = authSlice.actions
// // Example without useAppSelector hook
// // export const getCredentials = (state: RootState) => state.auth
//
// export default authSlice.reducer

type AuthType = {
    error: any
    userInfo?: TUserInfo
    userToken?: string
}

const initialState: AuthType = {
    error: null,
    userToken: ''
}

const authSlice = createSlice({
    extraReducers: {},
    initialState,
    name: 'auth',
    reducers: {
        login: (state, { payload }: PayloadAction<APIResponseLogin>) => {
            state.userToken = payload?.access_token || undefined
            state.userInfo = payload?.user || undefined

            localStorage.setItem('userToken', payload?.access_token || '')
        },
        logout: (state) => {
            state.userToken = ''
            // state.userInfo = undefined
            localStorage.setItem('userToken', '')
        },
        setToken: (state, action: PayloadAction<string>) => {
            state.userToken = action.payload
        }

        // setToken: (state, { payload: { userToken } }) => {
        //     // setCredentials: (state, { payload }: PayloadAction<IRestAuth>) => {
        //     localStorage.setItem('userToken', userToken)
        //     state.userToken = userToken
        // },
        // setUserInfo: (state, { payload: { userInfo } }) => {
        //     state.userInfo = userInfo
        // }
    }
})

export const { login, logout, setToken } = authSlice.actions

export const getStorageToken = (): string =>
    typeof window !== 'undefined' && localStorage.getItem('userToken')
        ? localStorage.getItem('userToken') || ''
        : ''

export default authSlice.reducer
