import { RefObject, useCallback, useEffect, useRef, useState } from 'react'

import { useRouter } from 'next/router'

import { copyTextToClipboard } from '@/utils/clipboard'

import { HorizonView } from './horizonView'
import { buildPermalinkUrl, encodePermalink } from './permalink'
import { StarMapSettings } from './types'
import { saveStarMapSettings } from './utils'

export interface UsePermalinkSyncOptions {
    showSettings?: boolean
    settings: StarMapSettings
    settingsRef: RefObject<StarMapSettings>
    centerRef: RefObject<[number, number, number]>
    /** Horizon mode: the direction the visitor is looking (useStarMapSettings) */
    viewRef: RefObject<HorizonView>
    date: Date | null
    dateRef: RefObject<Date | null>
    /** True once Celestial.display() has run (see useCelestialDisplay) */
    initializedRef: RefObject<boolean>
}

export interface PermalinkSyncController {
    /** "Copied" feedback on the copy-link button, reset after 2s */
    linkCopied: boolean
    /** Permalink shown for manual copying when clipboard access is unavailable (null = hidden) */
    manualLinkUrl: string | null
    closeManualLink: () => void
    /** Copy a permalink of the exact current view (FE-6) */
    handleCopyLink: () => Promise<void>
}

/**
 * Shareable permalink (FE-6): reflects the current view in the URL (replace, not push, so
 * panning doesn't spam browser history), persists the map center to localStorage as the
 * user drags/zooms, and copies the permalink to the clipboard with fallbacks.
 */
export const usePermalinkSync = ({
    showSettings,
    settings,
    settingsRef,
    centerRef,
    viewRef,
    date,
    dateRef,
    initializedRef
}: UsePermalinkSyncOptions): PermalinkSyncController => {
    const router = useRouter()
    // Mirror: syncUrl is registered in effects/intervals created once per deps change, so
    // it must always call the current router rather than the one captured at creation.
    const routerRef = useRef(router)
    routerRef.current = router

    const [linkCopied, setLinkCopied] = useState(false)
    // Permalink shown for manual copying when clipboard access is unavailable (null = hidden)
    const [manualLinkUrl, setManualLinkUrl] = useState<string | null>(null)
    const linkCopiedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    useEffect(() => () => clearTimeout(linkCopiedTimeoutRef.current), [])

    /** Snapshot of the current view (mode, place, moment, center, zoom) as permalink query params */
    const readCurrentView = useCallback((): Record<string, string> => {
        // Sky mode shares the equatorial center it is pointed at; horizon mode's center is
        // derived from the place and the instant, so it shares the view direction instead
        const isSky = settingsRef.current.viewMode === 'sky'
        const center = isSky ? (Celestial.rotate?.() as [number, number, number] | undefined) : undefined
        const view = isSky ? undefined : viewRef.current

        let zoomFactor: number | null = null

        try {
            const factor = Celestial.zoomBy?.()

            if (typeof factor === 'number' && Number.isFinite(factor)) {
                zoomFactor = factor
            }
        } catch {
            zoomFactor = null
        }

        return encodePermalink({
            settings: settingsRef.current,
            date: dateRef.current,
            center: center ?? null,
            view: view ?? null,
            zoom: zoomFactor
        })
    }, [settingsRef, dateRef, viewRef])

    const syncUrl = useCallback(() => {
        if (!showSettings || !initializedRef.current) {
            return
        }

        const currentRouter = routerRef.current

        void currentRouter.replace({ pathname: currentRouter.pathname, query: readCurrentView() }, undefined, {
            shallow: true,
            scroll: false
        })
    }, [showSettings, initializedRef, readCurrentView])

    // A bare visit to /starmap keeps its clean URL (and never exposes a saved geolocation
    // position in the address bar) — parameters appear only once the user actually
    // changes the view. The mount-time view key is remembered and the URL is synced only
    // when the key differs from the last synced one; unlike a "skip the first run" flag
    // this stays a no-op under React StrictMode's double-invoked mount effect.
    const [observerLat, observerLon] = settings.geopos
    const viewKey = `${settings.viewMode}_${settings.atmosphere ? 1 : 0}_${observerLat}_${observerLon}_${date?.getTime() ?? 'now'}`
    const syncedViewKeyRef = useRef(viewKey)
    useEffect(() => {
        if (!showSettings || !initializedRef.current || syncedViewKeyRef.current === viewKey) {
            return
        }

        // Marked as synced only when the debounced sync actually fires, so a re-run caused
        // by a new `syncUrl` identity re-schedules instead of dropping the pending sync
        const timeoutId = setTimeout(() => {
            syncedViewKeyRef.current = viewKey
            syncUrl()
        }, 500)

        return () => clearTimeout(timeoutId)
    }, [showSettings, viewKey, syncUrl])

    // Periodically save center position to localStorage when user drags/zooms the map
    // (sky mode only — in horizon mode the center is the zenith) and keep the permalink
    // URL in sync. Uses a ref (not state) to avoid triggering Celestial rebuilds.
    useEffect(() => {
        if (!showSettings) {
            return
        }

        const saveCenterToStorage = () => {
            if (settingsRef.current.viewMode !== 'sky') {
                return
            }

            const currentCenter = Celestial.rotate()
            if (!currentCenter) {
                return
            }

            const center = currentCenter as [number, number, number]
            const prev = centerRef.current

            if (prev[0] === center[0] && prev[1] === center[1] && prev[2] === center[2]) {
                return
            }

            centerRef.current = center
            saveStarMapSettings({ ...settings, center })
            syncUrl()
        }

        const intervalId = setInterval(saveCenterToStorage, 3000)

        return () => {
            clearInterval(intervalId)
        }
    }, [showSettings, settings, syncUrl])

    /** Copy a permalink of the exact current view (FE-6) */
    const handleCopyLink = useCallback(async () => {
        syncUrl()

        const url = buildPermalinkUrl(readCurrentView(), window.location.origin, window.location.pathname)

        // Clipboard API → execCommand fallback; if both fail (http, WebView, denied
        // permission) the link is shown for manual copying instead of failing silently
        if (await copyTextToClipboard(url)) {
            setManualLinkUrl(null)
            setLinkCopied(true)
            clearTimeout(linkCopiedTimeoutRef.current)
            linkCopiedTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000)
            return
        }

        setManualLinkUrl(url)
    }, [syncUrl, readCurrentView])

    const closeManualLink = useCallback(() => setManualLinkUrl(null), [])

    return { linkCopied, manualLinkUrl, closeManualLink, handleCopyLink }
}
