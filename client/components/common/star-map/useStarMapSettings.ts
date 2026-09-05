import { RefObject, useCallback, useRef, useState } from 'react'

import { DEFAULT_STARMAP_SETTINGS } from './constants'
import { clampView, DOME_VIEW, HorizonView } from './horizonView'
import { decodePermalinkFromLocation, PermalinkState } from './permalink'
import { StarMapSettings } from './types'
import { StarMapLocationState, useStarMapLocation } from './useStarMapLocation'
import { loadStarMapSettings, saveStarMapSettings } from './utils'

export interface UseStarMapSettingsOptions {
    /** Show the settings toggle button and panel (only used on the starmap page) */
    showSettings?: boolean
}

export interface StarMapSettingsController {
    /** Permalink parameters read once on mount (empty when the panel is disabled) */
    permalink: PermalinkState
    settings: StarMapSettings
    /** Mirror of `settings` for callbacks registered once with Celestial */
    settingsRef: RefObject<StarMapSettings>
    /** Current map center [ra, dec, orientation]; a ref so drag/zoom never rebuilds Celestial */
    centerRef: RefObject<[number, number, number]>
    /**
     * Horizon mode: the direction the visitor is looking. Like `centerRef` it is a ref, so
     * looking around never rebuilds Celestial; written by useHorizonNavigation, read by
     * useCelestialDisplay. Sky mode ignores it.
     */
    viewRef: RefObject<HorizonView>
    /** Zoom factor from the permalink, consumed once after the first display */
    permalinkZoomRef: RefObject<number | null>
    /** Location & time state (FE-2) */
    location: StarMapLocationState
    /** Selected moment; null means "now" */
    date: Date | null
    /** Mirror of `date` for callbacks registered once with Celestial */
    dateRef: RefObject<Date | null>
    handleSettingsChange: (newSettings: StarMapSettings) => void
}

/**
 * Settings state of the star map: localStorage-backed settings overridden by the
 * shareable permalink, the observer location/time state and the settings-change handler
 * (which also persists the current center). Geolocation is never requested from here: the
 * browser prompt only ever fires from an explicit button (useGeoNudge / the location control).
 */
export const useStarMapSettings = ({ showSettings }: UseStarMapSettingsOptions): StarMapSettingsController => {
    // Shared-view permalink (FE-6): read once on mount; its values override localStorage.
    // This component is client-only (see StarMap.tsx), so window exists on first render.
    const [permalink] = useState<PermalinkState>(() => (showSettings ? decodePermalinkFromLocation() : {}))

    // Settings state — only loaded from localStorage when showSettings is enabled;
    // permalink parameters win over the visitor's own saved settings
    const [settings, setSettings] = useState<StarMapSettings>(() => {
        if (!showSettings) {
            return DEFAULT_STARMAP_SETTINGS
        }

        return {
            ...loadStarMapSettings(),
            ...(permalink.viewMode ? { viewMode: permalink.viewMode } : {}),
            ...(permalink.geopos ? { geopos: permalink.geopos } : {}),
            ...(permalink.atmosphere !== undefined ? { atmosphere: permalink.atmosphere } : {})
        }
    })

    // Location & time state (FE-2): date === null means "now" and is never persisted
    const location = useStarMapLocation(settings.geopos, { initialDate: permalink.date ?? null })
    const { date } = location

    // Center is stored in a ref (not state) so that drag/zoom never triggers a full Celestial rebuild.
    // It is only read once on initial mount to restore the saved position.
    const centerRef = useRef<[number, number, number]>(
        permalink.center ?? (showSettings ? loadStarMapSettings().center : DEFAULT_STARMAP_SETTINGS.center)
    )
    const viewRef = useRef<HorizonView>(clampView(permalink.view ?? DOME_VIEW))
    const permalinkZoomRef = useRef<number | null>(permalink.zoom ?? null)

    // Mirrors for callbacks registered once with Celestial (drawCustomLayers / canvas handlers),
    // which otherwise would only ever see the snapshot captured at registration time.
    const settingsRef = useRef<StarMapSettings>(settings)
    settingsRef.current = settings
    const dateRef = useRef<Date | null>(date)
    dateRef.current = date

    const handleSettingsChange = useCallback((newSettings: StarMapSettings) => {
        // Persist the current map center alongside the settings change (sky mode only —
        // in horizon mode the "center" is the zenith, not a user-chosen position)
        if (settingsRef.current.viewMode === 'sky') {
            const currentCenter = Celestial.rotate?.() as [number, number, number] | undefined
            if (currentCenter) {
                centerRef.current = currentCenter
                newSettings = { ...newSettings, center: currentCenter }
            }
        }

        setSettings(newSettings)
        saveStarMapSettings(newSettings)
    }, [])

    return {
        permalink,
        settings,
        settingsRef,
        centerRef,
        viewRef,
        permalinkZoomRef,
        location,
        date,
        dateRef,
        handleSettingsChange
    }
}
