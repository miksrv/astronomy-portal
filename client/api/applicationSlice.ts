import * as LocalStorage from '@/functions/localstorage'
import { ApiModel } from '@/api'
import { LOCAL_STORAGE } from '@/functions/constants'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'

import i18Config from '../next-i18next.config'

interface ApplicationSliceProps {
    isActiveFormCatalog: boolean
    isActiveFormPhoto: boolean
    editableItemCatalog?: ApiModel.Catalog
    editableItemPhoto?: ApiModel.Photo

    showOverlay?: boolean
    headerHeight?: number
    footerHeight?: number
    locale?: 'ru' | 'en' | string
}

export const getStorageLocale = (): string | undefined =>
    typeof window !== 'undefined'
        ? LocalStorage.getItem(LOCAL_STORAGE.LOCALE as any) ??
          i18Config.i18n.defaultLocale
        : i18Config.i18n.defaultLocale

const initialState: ApplicationSliceProps = {
    footerHeight: 0,
    headerHeight: 0,

    isActiveFormCatalog: false,
    isActiveFormPhoto: false,
    locale: getStorageLocale(),
    showOverlay: false
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
        },

        setFooterHeight: (state, { payload }: PayloadAction<number>) => {
            state.footerHeight = payload
        },
        setHeaderHeight: (state, { payload }: PayloadAction<number>) => {
            state.headerHeight = payload
        },
        setLocale: (
            state,
            { payload }: PayloadAction<'ru' | 'en' | string>
        ) => {
            state.locale = payload
        },
        toggleOverlay: (state, { payload }: PayloadAction<boolean>) => {
            state.showOverlay = payload
        }
    }
})

export const {
    editCatalog,
    editPhoto,
    openFormCatalog,
    openFormPhoto,
    setFooterHeight,
    setHeaderHeight,
    toggleOverlay,
    setLocale
} = applicationSlice.actions

export default applicationSlice.reducer
