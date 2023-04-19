import { PayloadAction, createSlice } from '@reduxjs/toolkit'

// import { IRestAuth } from './types'
//
// // import { RootState } from './store'
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

const userToken = localStorage.getItem('userToken')
    ? localStorage.getItem('userToken')
    : null

const initialState = {
    error: null,
    loading: false,
    success: false, // for monitoring the registration process.
    userInfo: {}, // for user object
    userToken: null // for storing the JWT
}

const authSlice = createSlice({
    extraReducers: {},
    initialState,
    name: 'auth',
    reducers: {
        logout: (state) => {
            state.
        },
        setCredentials: (state, { payload }) => {
            state.userInfo = payload
        }
    }
})

export default authSlice.reducer
