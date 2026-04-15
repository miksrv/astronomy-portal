import { formatObjectName } from '@/utils/strings'

import {
    DEFAULT_STARMAP_SETTINGS,
    POINT_RADIUS,
    POPUP_HEIGHT,
    POPUP_OFFSET,
    POPUP_WIDTH,
    STARMAP_STORAGE_KEY
} from './constants'
import { StarMapObject } from './StarMap'
import { GeoJSON, HitResult, StarMapSettings } from './types'

/**
 * Clamp popup position so it stays within the container bounds.
 * If the popup would overflow right/bottom, flip it to the left/above the point.
 */
export const clampPopupPosition = (
    pointX: number,
    pointY: number,
    containerWidth: number,
    containerHeight: number
): { x: number; y: number } => {
    let x = pointX + POINT_RADIUS + POPUP_OFFSET
    let y = pointY - POINT_RADIUS - POPUP_OFFSET

    // Flip horizontally if overflowing right edge
    if (x + POPUP_WIDTH > containerWidth) {
        x = pointX - POINT_RADIUS - POPUP_OFFSET - POPUP_WIDTH
    }

    // Flip vertically if overflowing top edge
    if (y < 0) {
        y = pointY + POINT_RADIUS + POPUP_OFFSET
    }

    // Flip vertically if overflowing bottom edge
    if (y + POPUP_HEIGHT > containerHeight) {
        y = containerHeight - POPUP_HEIGHT
    }

    // Final safety clamp
    x = Math.max(0, Math.min(x, containerWidth - POPUP_WIDTH))
    y = Math.max(0, Math.min(y, containerHeight - POPUP_HEIGHT))

    return { x, y }
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
