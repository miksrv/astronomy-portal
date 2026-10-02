import * as LocalStorage from '@/utils/localstorage'

import { DEFAULT_STARMAP_SETTINGS } from './constants'
import { StarMapViewMode } from './types'

/**
 * Geolocation nudge for horizon mode (Business Rule 3 of features/star-atlas-upgrade.md).
 *
 * The browser's permission prompt is expensive: a first-time visitor from search who is
 * asked out of the blue will most likely deny it for good. So switching into horizon
 * mode never calls `navigator.geolocation` by itself — instead a small in-map nudge
 * explains what the button does, and only pressing it fires the prompt. The nudge is
 * shown only while the sky is still the observatory's fallback sky, i.e. the visitor has
 * never picked a place in any way (geolocation, manual coordinates, or a permalink).
 */

const GEOPOS_EPSILON = 1e-6

/** True when the observer position is still the hardcoded observatory fallback. */
export const isDefaultGeopos = (geopos: [number, number]): boolean =>
    Math.abs(geopos[0] - DEFAULT_STARMAP_SETTINGS.geopos[0]) < GEOPOS_EPSILON &&
    Math.abs(geopos[1] - DEFAULT_STARMAP_SETTINGS.geopos[1]) < GEOPOS_EPSILON

export type GeoNudgeConditions = {
    viewMode: StarMapViewMode
    geopos: [number, number]
    /** The visitor closed the nudge ("Later"/"OK") — persisted, never nag again */
    dismissed: boolean
    /** A geolocation attempt has already been made in this session (success or not) */
    geolocated: boolean
}

/** Whether the nudge should be on screen: horizon mode, fallback place, not yet answered. */
export const shouldShowGeoNudge = ({ viewMode, geopos, dismissed, geolocated }: GeoNudgeConditions): boolean =>
    viewMode === 'horizon' && isDefaultGeopos(geopos) && !dismissed && !geolocated

export const loadGeoNudgeDismissed = (): boolean => {
    try {
        return LocalStorage.getItem('STARMAP_GEO_NUDGE_DISMISSED') === 'true'
    } catch {
        return false
    }
}

export const saveGeoNudgeDismissed = (): void => {
    try {
        LocalStorage.setItem('STARMAP_GEO_NUDGE_DISMISSED', 'true')
    } catch {
        // Ignore quota/privacy-mode errors — the nudge will simply show again next visit
    }
}
