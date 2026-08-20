import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { ApiType } from '@/api'
import { LOCAL_STORAGE } from '@/utils/constants'
import * as LocalStorage from '@/utils/localstorage'

import i18Config from '../next-i18next.config'

export type SnackbarType = 'info' | 'success' | 'warning' | 'error'

export interface SnackbarItem {
    id: string
    type: SnackbarType
    message: string
    /** Auto-dismiss delay in ms; `SnackbarStack` falls back to a type-based default when omitted. */
    duration?: number
}

interface ApplicationSliceProps {
    showOverlay?: boolean
    showAuthDialog?: boolean
    locale?: ApiType.Locale | string
    snackbars: SnackbarItem[]
}

export const getStorageLocale = (): string | undefined =>
    typeof window !== 'undefined'
        ? (LocalStorage.getItem(LOCAL_STORAGE.LOCALE as 'LOCALE') ?? i18Config.i18n.defaultLocale)
        : i18Config.i18n.defaultLocale

const initialState: ApplicationSliceProps = {
    locale: getStorageLocale(),
    showOverlay: false,
    showAuthDialog: false,
    snackbars: []
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
        },
        pushSnackbar: (state, { payload }: PayloadAction<SnackbarItem>) => {
            state.snackbars.push(payload)
        },
        dismissSnackbar: (state, { payload }: PayloadAction<string>) => {
            state.snackbars = state.snackbars.filter((item) => item.id !== payload)
        }
    }
})

export const { setLocale, closeAuthDialog, openAuthDialog, pushSnackbar, dismissSnackbar } = applicationSlice.actions

export default applicationSlice.reducer
