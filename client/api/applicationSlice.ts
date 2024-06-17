import { ApiModel } from '@/api'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'

type TApplicationSlice = {
    isActiveFormCatalog: boolean
    isActiveFormPhoto: boolean
    editableItemCatalog?: ApiModel.Catalog
    editableItemPhoto?: ApiModel.Photo
}

const initialState: TApplicationSlice = {
    isActiveFormCatalog: false,
    isActiveFormPhoto: false
}

const applicationSlice = createSlice({
    initialState,
    name: 'application',
    reducers: {
        editCatalog: (
            state,
            action: PayloadAction<ApiModel.Catalog | undefined>
        ) => {
            state.editableItemCatalog = action.payload
        },
        editPhoto: (
            state,
            action: PayloadAction<ApiModel.Photo | undefined>
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

            if (action.payload === false) {
                state.editableItemPhoto = undefined
            }
        }
    }
})

export const { editCatalog, editPhoto, openFormCatalog, openFormPhoto } =
    applicationSlice.actions

export default applicationSlice.reducer
