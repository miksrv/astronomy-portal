import { formatObjectName } from '@/utils/strings'

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
    containerHeight: number
): PopupPosition => {
    const gap = POINT_RADIUS + POPUP_OFFSET + POPUP_ARROW_SIZE

    const belowY = pointY + gap
    const aboveY = pointY - gap - POPUP_HEIGHT
    const fitsBelow = belowY + POPUP_HEIGHT <= containerHeight
    const fitsAbove = aboveY >= 0

    const placement: PopupPlacement = fitsBelow || !fitsAbove ? 'below' : 'above'
    const y = Math.max(0, placement === 'below' ? Math.min(belowY, containerHeight - POPUP_HEIGHT) : aboveY)

    const x = Math.max(0, Math.min(pointX - POPUP_WIDTH / 2, containerWidth - POPUP_WIDTH))
    const arrowOffset = Math.max(POPUP_ARROW_MARGIN, Math.min(pointX - x, POPUP_WIDTH - POPUP_ARROW_MARGIN))

    return { x, y, arrowOffset, placement }
}

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
