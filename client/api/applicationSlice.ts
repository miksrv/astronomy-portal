import { TCatalog, TPhoto } from '@/api/types'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'

type TApplicationSlice = {
    isActiveFormCatalog: boolean
    isActiveFormPhoto: boolean
    editableItemCatalog?: TCatalog
    editableItemPhoto?: TPhoto
}

const initialState: TApplicationSlice = {
    isActiveFormCatalog: false,
    isActiveFormPhoto: false
}

const applicationSlice = createSlice({
    extraReducers: {},
    initialState,
    name: 'auth',
    reducers: {
        editCatalog: (state, action: PayloadAction<TCatalog | undefined>) => {
            state.editableItemCatalog = action.payload
        },
        editableItemPhoto: (
            state,
            action: PayloadAction<TPhoto | undefined>
        ) => {
            state.editableItemPhoto = action.payload
        },
        openFormCatalog: (state, action: PayloadAction<boolean>) => {
            state.isActiveFormCatalog = action.payload

            if (action.payload === false) {
                state.editableItemCatalog = undefined
            }
        },
        openFormPhoto: (state, action: PayloadAction<boolean>) => {
            state.isActiveFormPhoto = action.payload
        }
    }
})

export const {
    editCatalog,
    editableItemPhoto,
    openFormCatalog,
    openFormPhoto
} = applicationSlice.actions

export default applicationSlice.reducer
