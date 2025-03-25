import i18Config from '../next-i18next.config'

import { ApiType } from '@/api'
import { LOCAL_STORAGE } from '@/tools/constants'
import * as LocalStorage from '@/tools/localstorage'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ApplicationSliceProps {
    showOverlay?: boolean
    showAuthDialog?: boolean
    locale?: ApiType.Locale | string
}

export const getStorageLocale = (): string | undefined =>
    typeof window !== 'undefined'
        ? (LocalStorage.getItem(LOCAL_STORAGE.LOCALE as any) ?? i18Config.i18n.defaultLocale)
        : i18Config.i18n.defaultLocale

const initialState: ApplicationSliceProps = {
    locale: getStorageLocale(),
    showOverlay: false,
    showAuthDialog: false
}

const applicationSlice = createSlice({
    initialState,
    name: 'application',
    reducers: {
        setLocale: (state, { payload }: PayloadAction<ApiType.Locale | string>) => {
            state.locale = payload
        },
        closeAuthDialog: (state) => {
            state.showOverlay = false
            state.showAuthDialog = false
        },
        openAuthDialog: (state) => {
            state.showOverlay = true
            state.showAuthDialog = true
        }
    }
})

export const { setLocale, closeAuthDialog, openAuthDialog } = applicationSlice.actions

export default applicationSlice.reducer
