import { RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'

import { readCenter } from './celestialApi'
import { DEFAULT_STARMAP_SETTINGS } from './constants'
import { clampView, HorizonView, INITIAL_VIEW } from './horizonView'
import { decodePermalinkFromLocation, PermalinkState } from './permalink'
import { StarMapSettings } from './types'
import { StarMapLocationState, useStarMapLocation } from './useStarMapLocation'
import { loadStarMapSettings, saveStarMapSettings } from './utils'

export interface UseStarMapSettingsOptions {
    /** Show the settings toggle button and panel (only used on the starmap page) */
    showSettings?: boolean
}

export interface StarMapSettingsController {
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
    /** Replace the whole settings object (the settings form hands back a complete one) */
    handleSettingsChange: (newSettings: StarMapSettings) => void
    /**
     * Merge a partial change into the *current* settings. Safe from callbacks whose
     * closure may be stale (a geolocation that resolves seconds later, a toolbar toggle):
     * the base is `settingsRef`, not the render that created the callback, so toggles made
     * in between are kept.
     */
    updateSettings: (patch: Partial<StarMapSettings>) => void
}

/**
 * Settings state of the star map: localStorage-backed settings overridden by the
 * shareable permalink, the observer location/time state and the settings-change handlers
 * (which also persist the current center). Geolocation is never requested from here: the
 * browser prompt only ever fires from an explicit button (useGeoNudge / the location control).
 */
export const useStarMapSettings = ({ showSettings }: UseStarMapSettingsOptions): StarMapSettingsController => {
    // Shared-view permalink (FE-6): read once on mount; its values override localStorage.
    // This component is client-only (see StarMap.tsx), so window exists on first render.
    const [permalink] = useState<PermalinkState>(() => (showSettings ? decodePermalinkFromLocation() : {}))

    // Settings state — only loaded from localStorage when showSettings is enabled;
    // permalink parameters win over the visitor's own saved settings
    const [settings, setSettingsState] = useState<StarMapSettings>(() => {
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

    // Mirror for callbacks registered once with Celestial (drawCustomLayers / canvas
    // handlers), which otherwise would only ever see the snapshot captured at registration
    // time. Written by the setter, not during render: the ref is then current for anything
    // that runs before the next render, including a second update in the same task.
    const settingsRef = useRef<StarMapSettings>(settings)

    const setSettings = useCallback((next: StarMapSettings) => {
        settingsRef.current = next
        setSettingsState(next)
    }, [])

    // Location & time state (FE-2): date === null means "now" and is never persisted
    const location = useStarMapLocation(settings.geopos, { initialDate: permalink.date ?? null })
    const { date } = location

    const dateRef = useRef<Date | null>(date)

    useLayoutEffect(() => {
        dateRef.current = date
    }, [date])

    // Center is stored in a ref (not state) so that drag/zoom never triggers a full Celestial rebuild.
    // It is only read once on initial mount to restore the saved position.
    const centerRef = useRef<[number, number, number]>(
        permalink.center ?? (showSettings ? loadStarMapSettings().center : DEFAULT_STARMAP_SETTINGS.center)
    )
    const viewRef = useRef<HorizonView>(clampView(permalink.view ?? INITIAL_VIEW))
    const permalinkZoomRef = useRef<number | null>(permalink.zoom ?? null)

    const handleSettingsChange = useCallback(
        (newSettings: StarMapSettings) => {
            // Persist the current map center alongside the settings change (sky mode only —
            // in horizon mode the "center" is the zenith, not a user-chosen position)
            if (settingsRef.current.viewMode === 'sky') {
                const currentCenter = readCenter()

                if (currentCenter) {
                    centerRef.current = currentCenter
                    newSettings = { ...newSettings, center: currentCenter }
                }
            }

            setSettings(newSettings)
            saveStarMapSettings(newSettings)
        },
        [setSettings]
    )

    const updateSettings = useCallback(
        (patch: Partial<StarMapSettings>) => handleSettingsChange({ ...settingsRef.current, ...patch }),
        [handleSettingsChange]
    )

    return {
        settings,
        settingsRef,
        centerRef,
        viewRef,
        permalinkZoomRef,
        location,
        date,
        dateRef,
        handleSettingsChange,
        updateSettings
    }
}
