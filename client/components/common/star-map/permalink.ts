import { toCelestialLon } from './angles'
import { HorizonView, isDomeView, MAX_VIEW_ALTITUDE, MIN_VIEW_ALTITUDE, normalizeAzimuth } from './horizonView'
import { StarMapSettings, StarMapViewMode } from './types'

/**
 * Shareable permalink (FE-6 of features/star-atlas-upgrade.md): the view mode,
 * observer position, selected moment, map center and zoom are round-tripped through
 * the page's query string, so a shared link reproduces the sender's exact view
 * regardless of the recipient's own saved settings.
 */

export type PermalinkState = {
    viewMode?: StarMapViewMode
    geopos?: [number, number]
    /** Absolute instant; absent = "now" */
    date?: Date
    center?: [number, number, number]
    zoom?: number
    /** Horizon-mode daylight gradient; absent = default (on) */
    atmosphere?: boolean
    /** Horizon-mode view direction (degrees); absent = the whole-sky dome */
    view?: HorizonView
}

// Not utils/helpers' round: that one returns `number | undefined` for an absent value, while every input here is a finite number
const round = (value: number, digits: number): number => Number(value.toFixed(digits))

/**
 * Years a shared moment may fall in. astronomy-engine's ephemerides are only fitted for a
 * few centuries around now and extrapolate garbage beyond, and timezone.ts derives offsets
 * via Date.UTC, which reads a year below 100 as 19xx — so anything outside is dropped, not
 * clamped (a clamped date would silently show a different sky than the sender meant).
 */
const MIN_PERMALINK_YEAR = 1900
const MAX_PERMALINK_YEAR = 2200

/** Build the query parameters describing the current view. Only meaningful values are included. */
export const encodePermalink = (state: {
    settings: Pick<StarMapSettings, 'viewMode' | 'geopos' | 'atmosphere'>
    date: Date | null
    center?: [number, number, number] | null
    zoom?: number | null
    /** Horizon mode only: where the visitor is looking */
    view?: HorizonView | null
}): Record<string, string> => {
    const query: Record<string, string> = {
        view: state.settings.viewMode,
        // 2 decimals ≈ 1 km — deliberately coarser than the stored geopos: the URL is
        // meant to be shared, and a browser-geolocation position at full precision would
        // leak the sender's exact whereabouts. ~1 km changes nothing in the rendered sky.
        lat: String(round(state.settings.geopos[0], 2)),
        lon: String(round(state.settings.geopos[1], 2))
    }

    if (state.date) {
        // Second precision is plenty; strip milliseconds for a shorter link
        query.dt = state.date.toISOString().replace(/\.\d{3}Z$/, 'Z')
    }

    if (state.center && state.center.every((value) => Number.isFinite(value))) {
        query.c = state.center.map((value) => String(round(value, 2))).join(',')
    }

    if (typeof state.zoom === 'number' && Number.isFinite(state.zoom) && state.zoom > 0) {
        query.z = String(round(state.zoom, 2))
    }

    // Only when it differs from the default (on) — keeps ordinary links short
    if (!state.settings.atmosphere) {
        query.atm = '0'
    }

    // Horizon mode has no shareable equatorial center — what matters is the direction the
    // visitor is looking. Omitted for the default whole-sky dome, which keeps links short.
    const view = state.view

    if (view && Number.isFinite(view.azimuth) && Number.isFinite(view.altitude) && !isDomeView(view)) {
        query.az = String(round(normalizeAzimuth(view.azimuth), 1))
        query.alt = String(round(view.altitude, 1))
    }

    return query
}

const parseNumber = (value: string | string[] | undefined): number | null => {
    if (typeof value !== 'string' || value.trim() === '') {
        return null
    }

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

/** Parse and validate permalink query parameters; invalid/absent values are simply omitted. */
export const decodePermalink = (query: Record<string, string | string[] | undefined>): PermalinkState => {
    const state: PermalinkState = {}

    if (query.view === 'sky' || query.view === 'horizon') {
        state.viewMode = query.view
    }

    const lat = parseNumber(query.lat)
    const lon = parseNumber(query.lon)

    if (lat != null && lon != null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        state.geopos = [lat, lon]
    }

    if (typeof query.dt === 'string') {
        const date = new Date(query.dt)
        const year = date.getUTCFullYear()

        if (!Number.isNaN(date.getTime()) && year >= MIN_PERMALINK_YEAR && year <= MAX_PERMALINK_YEAR) {
            state.date = date
        }
    }

    if (typeof query.c === 'string') {
        const [ra, dec, roll] = query.c.split(',').map(parseNumber)

        // Declination outside ±90 or a non-finite part means a mangled link — the whole
        // center is ignored rather than clamped to something the sender never saw
        if (ra != null && dec != null && roll != null && Math.abs(dec) <= 90) {
            state.center = [toCelestialLon(ra), dec, roll]
        }
    }

    const zoom = parseNumber(query.z)

    if (zoom != null && zoom > 0 && zoom <= 100) {
        state.zoom = zoom
    }

    if (query.atm === '0' || query.atm === '1') {
        state.atmosphere = query.atm === '1'
    }

    const azimuth = parseNumber(query.az)
    const altitude = parseNumber(query.alt)

    if (azimuth != null && altitude != null && altitude >= MIN_VIEW_ALTITUDE && altitude <= MAX_VIEW_ALTITUDE) {
        state.view = { azimuth: normalizeAzimuth(azimuth), altitude }
    }

    return state
}

/** Read the permalink directly from the current location (client-side initial mount). */
export const decodePermalinkFromLocation = (): PermalinkState => {
    if (typeof window === 'undefined') {
        return {}
    }

    return decodePermalink(Object.fromEntries(new URLSearchParams(window.location.search).entries()))
}

/**
 * Absolute shareable URL for a permalink query — the current page with the view
 * parameters as its query string (any existing query is replaced, not merged).
 */
export const buildPermalinkUrl = (query: Record<string, string>, origin: string, pathname: string): string => {
    const search = new URLSearchParams(query).toString()

    return `${origin}${pathname}${search ? `?${search}` : ''}`
}
