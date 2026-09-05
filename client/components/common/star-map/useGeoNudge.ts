import { useCallback, useState } from 'react'

import { loadGeoNudgeDismissed, saveGeoNudgeDismissed, shouldShowGeoNudge } from './geoNudge'
import { StarMapSettings } from './types'

export interface UseGeoNudgeOptions {
    /** Only the settings page (/starmap) shows the nudge */
    enabled: boolean
    settings: StarMapSettings
    /** Browser geolocation; resolves to null on deny/timeout/unsupported */
    requestBrowserLocation: () => Promise<[number, number] | null>
    /** Applies a granted position through the shared settings handler (persist + live patch) */
    onGeoposChange: (geopos: [number, number]) => void
}

export type GeoNudgeStatus = 'hidden' | 'prompt' | 'failed'

export interface GeoNudgeController {
    /** 'prompt' — the "show the sky above you?" card; 'failed' — the fallback notice */
    status: GeoNudgeStatus
    /** Explicit gesture → the only place the browser permission prompt is ever triggered */
    locate: () => Promise<void>
    /** "Later" / "OK": close and remember, never nag again */
    dismiss: () => void
}

/**
 * State of the horizon-mode geolocation nudge. Pure visibility rules live in
 * `geoNudge.ts`; this hook adds the per-session "already attempted" flag, the failure
 * notice and the persisted dismissal.
 */
export const useGeoNudge = ({
    enabled,
    settings,
    requestBrowserLocation,
    onGeoposChange
}: UseGeoNudgeOptions): GeoNudgeController => {
    // Read once on mount (client-only component, see StarMap.tsx)
    const [dismissed, setDismissed] = useState<boolean>(() => loadGeoNudgeDismissed())
    const [geolocated, setGeolocated] = useState(false)
    const [failed, setFailed] = useState(false)

    const dismiss = useCallback(() => {
        setFailed(false)
        setDismissed(true)
        saveGeoNudgeDismissed()
    }, [])

    const locate = useCallback(async () => {
        const position = await requestBrowserLocation()

        setGeolocated(true)

        if (position) {
            onGeoposChange(position)
            return
        }

        // Denied/timed out/unsupported: say so once, keep the observatory's sky
        // (Business Rule 3 — never block, never re-ask)
        setFailed(true)
    }, [requestBrowserLocation, onGeoposChange])

    let status: GeoNudgeStatus = 'hidden'

    if (enabled) {
        if (failed) {
            status = 'failed'
        } else if (
            shouldShowGeoNudge({
                viewMode: settings.viewMode,
                geopos: settings.geopos,
                dismissed,
                geolocated
            })
        ) {
            status = 'prompt'
        }
    }

    return { status, locate, dismiss }
}
