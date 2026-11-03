// Open/closed state of the collapsible settings groups, kept per browser. A convenience
// only: storage may be unavailable (private mode, blocked site data), then every group
// simply opens in its default state.

import { STARMAP_GROUPS_STORAGE_KEY as STORAGE_KEY } from './constants'

const readAll = (): Record<string, boolean> => {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')

        return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {}
    } catch {
        return {}
    }
}

export const readGroupOpen = (key: string, fallback: boolean): boolean => {
    const value = readAll()[key]

    return typeof value === 'boolean' ? value : fallback
}

export const writeGroupOpen = (key: string, open: boolean): void => {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [key]: open }))
    } catch {
        // Storage unavailable — the state just isn't remembered
    }
}
