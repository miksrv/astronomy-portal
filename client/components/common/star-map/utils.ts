import { formatObjectName } from '@/utils/strings'

import { customConfig, defaultConfig } from './config'
import {
    DEFAULT_STARMAP_SETTINGS,
    POINT_RADIUS,
    POPUP_ARROW_MARGIN,
    POPUP_ARROW_SIZE,
    POPUP_HEIGHT,
    POPUP_OFFSET,
    POPUP_WIDTH,
    STARMAP_STORAGE_KEY
} from './constants'
import { StarMapObject } from './StarMap'
import { GeoJSON, HitResult, PopupPlacement, StarMapSettings } from './types'

export type PopupPosition = {
    x: number
    y: number
    arrowOffset: number
    placement: PopupPlacement
}

/**
 * Position the popup centered under the marker (arrow pointing up at it), falling back to
 * above the marker (arrow pointing down) only when there isn't enough room below. The popup
 * itself is then clamped to the container's horizontal bounds, and the arrow offset is kept
 * pointing at the marker's actual position within the (possibly shifted) popup.
 */
export const clampPopupPosition = (
    pointX: number,
    pointY: number,
    containerWidth: number,
    containerHeight: number,
    popupWidth: number = POPUP_WIDTH,
    popupHeight: number = POPUP_HEIGHT
): PopupPosition => {
    const gap = POINT_RADIUS + POPUP_OFFSET + POPUP_ARROW_SIZE

    const belowY = pointY + gap
    const aboveY = pointY - gap - popupHeight
    const fitsBelow = belowY + popupHeight <= containerHeight
    const fitsAbove = aboveY >= 0

    const placement: PopupPlacement = fitsBelow || !fitsAbove ? 'below' : 'above'
    const y = Math.max(0, placement === 'below' ? Math.min(belowY, containerHeight - popupHeight) : aboveY)

    const x = Math.max(0, Math.min(pointX - popupWidth / 2, containerWidth - popupWidth))
    const arrowOffset = Math.max(POPUP_ARROW_MARGIN, Math.min(pointX - x, popupWidth - POPUP_ARROW_MARGIN))

    return { x, y, arrowOffset, placement }
}

/**
 * Top edge (px) of the arrow connecting the popup to its marker: flush with the popup's
 * top when the popup sits below the marker, flush with its measured bottom edge when it
 * sits above — the info variant is auto-height, so the constant POPUP_HEIGHT can't be used.
 */
export const getPopupArrowTop = (popupY: number, popupHeight: number, placement: PopupPlacement): number =>
    placement === 'above' ? popupY + popupHeight : popupY - POPUP_ARROW_SIZE

/**
 * Find the first sky-point within hit radius of (x, y).
 * Returns the matched point data or null.
 */
export const findHitPoint = (x: number, y: number): HitResult | null => {
    let result: HitResult | null = null

    Celestial.container.selectAll('.sky-points').each((point: HitResult['point']) => {
        if (result) {
            return
        }

        const coords = Celestial.mapProjection(point.geometry.coordinates)
        const dx = x - coords[0]
        const dy = y - coords[1]

        if (dx * dx + dy * dy < POINT_RADIUS * POINT_RADIUS) {
            result = { coords, point }
        }
    })

    return result
}

/**
 * Convert StarMapObject[] into a GeoJSON FeatureCollection
 * compatible with Celestial.js data format.
 */
export const createObjectsJSON = (objects?: StarMapObject[]): GeoJSON | undefined => {
    if (!objects?.length) {
        return undefined
    }

    return {
        type: 'FeatureCollection',
        features: objects.map((item) => ({
            type: 'Feature',
            id: item.name,
            geometry: {
                type: 'Point',
                coordinates: [Number(item.ra), Number(item.dec)]
            },
            properties: {
                dim: 30,
                mag: 10,
                name: formatObjectName(item.name)
            }
        }))
    }
}

/** Load star map settings from localStorage, falling back to defaults. */
export const loadStarMapSettings = (): StarMapSettings => {
    if (typeof window === 'undefined') {
        return DEFAULT_STARMAP_SETTINGS
    }

    try {
        const raw = localStorage.getItem(STARMAP_STORAGE_KEY)
        if (raw) {
            return { ...DEFAULT_STARMAP_SETTINGS, ...JSON.parse(raw) }
        }
    } catch {
        // Ignore corrupted data
    }

    return DEFAULT_STARMAP_SETTINGS
}

/** Persist star map settings to localStorage. */
export const saveStarMapSettings = (settings: StarMapSettings): void => {
    if (typeof window === 'undefined') {
        return
    }

    try {
        localStorage.setItem(STARMAP_STORAGE_KEY, JSON.stringify(settings))
    } catch {
        // Ignore quota errors
    }
}

/**
 * Full snapshot of the settings-panel-driven Celestial config. Used only to build the
 * config object passed to `Celestial.display()` (initial mount / objects / zoom / language
 * change) — never to `Celestial.apply()`, see `buildLiveSettingsPatch` below for why.
 */
const TRANSPARENT_STROKE = 'rgba(0, 0, 0, 0)'

export type HorizonCanvasLayout = {
    /** Projection width handed to Celestial (`width`) — the airy dome's diameter */
    width: number
    /** Extra canvas width (`background.width`) so the canvas covers the container */
    backgroundWidth: number
}

/**
 * Canvas geometry for horizon mode in a fitContainer box. The airy projection is a 1:1
 * dome whose base scale is derived from the projection `width`, and Celestial's minimum
 * zoom is exactly that base — the dome can never be zoomed *out* below it. So the
 * projection width is the container's smaller side (the dome fits the visible area), and
 * `background.width` — which d3-celestial adds to the canvas width on top of the
 * projection width, centering the projection in the wider canvas — pads the canvas up to
 * the larger side. The result is a square canvas of the larger side: on landscape it
 * spans the full width and overflows vertically, on portrait it spans the full height and
 * overflows horizontally; `.starMapFit` centers and crops the overflow either way.
 */
export const computeHorizonCanvasLayout = (containerWidth: number, containerHeight: number): HorizonCanvasLayout => {
    const width = Math.max(1, Math.round(Math.min(containerWidth, containerHeight)))
    const largest = Math.max(1, Math.round(Math.max(containerWidth, containerHeight)))

    return { width, backgroundWidth: Math.max(0, largest - width) }
}

export const buildVisualConfig = (settings: StarMapSettings) => {
    const horizonMode = settings.viewMode === 'horizon'

    return {
        // Horizon mode keeps transform 'equatorial' (d3-celestial has no horizontal
        // transform) — the local-sky view comes from following the zenith for the
        // observer's position under an azimuthal projection.
        // airy clips at exactly 90° from the center, so with the zenith centered the
        // visible disc IS the sky dome down to the horizon (verified against the bundled
        // build: stereographic clips at ~180° and can't be zoomed out far enough)
        projection: horizonMode ? 'airy' : customConfig.projection,
        // Horizon mode starts fully zoomed out so the whole sky dome — with the horizon
        // circle, ground silhouette and compass labels — fits the view.
        ...(horizonMode ? { zoomlevel: 1 } : {}),
        // Horizon mode drives rotation and zoom itself (useHorizonNavigation), frame by
        // frame from the pointer — Celestial's own 1.5–2 s rotate/zoom transitions would
        // queue up behind every drag frame and fight it. It also keeps the once-a-minute
        // zenith re-center instant instead of swinging the dome through a rotation.
        ...(horizonMode ? { disableAnimations: true } : {}),
        // location:true makes Celestial create its (CSS-hidden, see styles.module.sass)
        // #celestial-form — without those form inputs, Celestial.skyview()/date()
        // dereference null and throw, so this is what makes the date/location API usable.
        location: true,
        // The settings-page map draws its own zoom/fit buttons in the toolbar rail
        // (StarMapRender), so Celestial's built-in #celestial-zoomin/#celestial-zoomout
        // inputs are not created here. Object/photo pages keep customConfig.controls.
        controls: false,
        // Never let Celestial call its bundled third-party timezone lookup
        // (api.timezonedb.com, hard-coded key, plain http): it would leak the visitor's
        // coordinates on every location change, and its result breaks the map — see
        // buildSkyviewPatch below for why. Timezones are resolved locally (timezone.ts).
        settimezone: false,
        // Horizon mode: the canvas is padded past the projection width so it covers the
        // whole container (see computeHorizonCanvasLayout) — d3-celestial reuses
        // background.width both as that padding and as the outline stroke width, so the
        // stroke is made transparent (the horizon line is drawn by `horizon` anyway).
        // The actual padding is filled in by useCelestialDisplay from the container size.
        background: horizonMode
            ? { ...defaultConfig.background, stroke: TRANSPARENT_STROKE, width: 0 }
            : customConfig.background,
        geopos: settings.geopos,
        // Horizon mode drives the center itself (useCelestialDisplay/horizonView): a
        // 'zenith' follow would re-center — and re-level — the map on every skyview(),
        // throwing away wherever the visitor was looking. 'center' leaves it alone.
        follow: horizonMode ? 'center' : customConfig.follow,
        horizon: {
            show: horizonMode,
            stroke: '#cccccc',
            width: 1.2,
            fill: '#000000',
            opacity: 0.4
        },
        daylight: { show: horizonMode && settings.atmosphere },
        stars: {
            ...defaultConfig.stars,
            ...customConfig.stars,
            show: settings.starsShow,
            limit: settings.starsLimit
        },
        dsos: {
            ...defaultConfig.dsos,
            show: settings.dsosShow,
            // Full catalog is opt-in and lazy: the file is only fetched when the map is
            // (re)built with it enabled (Business Rule 5)
            data: settings.dsosFull ? 'dsos.6.json' : 'dsos.bright.json'
        },
        constellations: {
            ...customConfig.constellations,
            names: settings.constellationNames,
            lines: settings.constellationLines,
            bounds: settings.constellationBounds
        },
        lines: {
            graticule: { ...customConfig.lines.graticule, show: settings.graticule },
            equatorial: { ...defaultConfig.lines.equatorial, show: settings.equatorial },
            ecliptic: { ...defaultConfig.lines.ecliptic, show: settings.ecliptic },
            galactic: { ...defaultConfig.lines.galactic, show: settings.galactic },
            supergalactic: defaultConfig.lines.supergalactic
        },
        mw: { ...defaultConfig.mw, show: settings.milkyWay },
        planets: { ...defaultConfig.planets, show: settings.planetsShow }
    }
}

/**
 * Argument for `Celestial.skyview()`: the instant to show, the browser's UTC offset for
 * that instant (minutes, Celestial's own unit), and optionally the observer position.
 *
 * The timezone must always be sent, for two reasons found in the bundled build:
 * - Celestial stores the date as a plain Date but derives the zenith from
 *   `date − (timezone − browserOffset)`. Its own timezone can silently change to the
 *   *place's* offset (the timezonedb lookup — disabled via `settimezone: false`), after
 *   which the dome is centered hours off (12 h for a UTC−7 browser looking at UTC+5).
 *   Pinning the timezone to the browser's offset makes that correction a no-op, so the
 *   zenith, the daylight gradient and the planets all agree on the same instant.
 * - With `settimezone: false`, a location-only skyview() call returns before redrawing
 *   (that path is the lookup's callback); passing a timezone routes it through the
 *   normal redraw/re-center path instead.
 */
export const buildSkyviewPatch = (
    date: Date,
    location?: [number, number]
): { date: Date; timezone: number; location?: [number, number] } => ({
    date,
    timezone: -date.getTimezoneOffset(),
    ...(location ? { location } : {})
})

/**
 * Minimal patch for `Celestial.apply()` — only the leaf fields the settings panel can
 * actually toggle. `Celestial.apply()` merges each top-level group (stars/dsos/constellations/...)
 * one level deep against its already-resolved internal state, it does not re-run the
 * defaults/normalization pass that `Celestial.display()` does on mount. Static fields like
 * `constellations.namesType` start out symbolic ('iau') and get resolved once at mount to the
 * actual GeoJSON property key ('name'). Re-sending the raw 'iau' on every apply() call (as the
 * old shared buildVisualConfig did) reverted that resolution, so constellation labels rendered
 * as literal "undefined" (`feature.properties['iau']` doesn't exist) once names were toggled
 * back on. Omitting namesType/designationType/propernameType/etc. here lets Celestial keep
 * whatever it already resolved.
 */
export const buildLiveSettingsPatch = (settings: StarMapSettings) => ({
    stars: { show: settings.starsShow, limit: settings.starsLimit },
    dsos: { show: settings.dsosShow },
    constellations: {
        names: settings.constellationNames,
        lines: settings.constellationLines,
        bounds: settings.constellationBounds
    },
    lines: {
        graticule: { ...customConfig.lines.graticule, show: settings.graticule },
        equatorial: { ...defaultConfig.lines.equatorial, show: settings.equatorial },
        ecliptic: { ...defaultConfig.lines.ecliptic, show: settings.ecliptic },
        galactic: { ...defaultConfig.lines.galactic, show: settings.galactic }
    },
    mw: { show: settings.milkyWay },
    planets: { show: settings.planetsShow },
    // Read at redraw time by Celestial's daylight pass (`apply()` is `set()` + redraw in
    // the bundled build, and only the hidden form's own change handler re-reads its
    // checkbox), so the atmosphere switch is a plain live patch — no rebuild needed.
    daylight: { show: settings.viewMode === 'horizon' && settings.atmosphere }
})
