import { createSlice } from '@reduxjs/toolkit'

interface InitialStateProps {
    visible: boolean
}

export const loginModalSlice = createSlice({
    initialState: { visible: false } as InitialStateProps,
    name: 'loginModal',
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

export const { show, hide, toggle } = loginModalSlice.actions

export default loginModalSlice.reducer
