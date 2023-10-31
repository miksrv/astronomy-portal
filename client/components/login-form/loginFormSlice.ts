import { createSlice } from '@reduxjs/toolkit'

interface InitialStateProps {
    visible: boolean
}

export const loginFormSlice = createSlice({
    initialState: { visible: false } as InitialStateProps,
    name: 'loginform',
    reducers: {
        hide: (state) => {
            state.visible = false
        },
        show: (state) => {
            state.visible = true
        },
        toggle: (state) => {
            state.visible = !state.visible
        }
    }
})

export const { show, hide, toggle } = loginFormSlice.actions

export default loginFormSlice.reducer
