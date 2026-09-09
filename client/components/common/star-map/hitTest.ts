import { CatalogPosition } from './catalogs'
import { MeteorShower } from './meteorShowers'
import { BodyPosition, CelestialObjectKind } from './objectInfo'

/**
 * Hit-testing for the objects d3-celestial renders (FE-8 of features/star-atlas-upgrade.md).
 *
 * d3-celestial has no public click-for-info API and keeps its loaded star/DSO features
 * in a private closure (nothing usable is bound to Celestial.container), so the caller
 * passes the same catalogs re-fetched from `/data/` (browser-cached — celestial already
 * downloaded them) and solar-system positions computed independently via
 * astronomy-engine (Business Rule 10). The check itself is the portal `.sky-points`
 * layer's own pattern: iterate → project → distance-check.
 */

export type BuiltinHit = {
    kind: CelestialObjectKind
    /** HIP number for stars, catalog id for DSOs, astronomy-engine Body for planets, shower id for radiants */
    id: string
    ra: number
    dec: number
    magnitude?: number
}

export const HIT_RADIUS = {
    body: 14,
    radiant: 10,
    dso: 8,
    star: 7
}

/**
 * Hover (cursor) checks run on every mouse-move frame, so they scan a cheaper subset
 * than a click does: only stars/DSOs that are actually prominent on screen. A dim
 * object still opens its info panel on click — it just doesn't flip the cursor.
 */
export const HOVER_STAR_MAG_LIMIT = 4
export const HOVER_DSO_MAG_LIMIT = 9

/** Entries at or brighter than `limit`; entries without a numeric magnitude are dropped. */
export const filterByMagnitude = <T extends { mag?: number }>(items: T[], limit: number): T[] =>
    items.filter((item) => (item.mag ?? 99) <= limit)

/** Closest point of a plain [ra, dec] list within the hit radius. */
const scanPositions = <T extends { ra: number; dec: number }>(
    items: T[],
    x: number,
    y: number,
    radius: number
): { item: T; distance: number } | null => {
    let best: { item: T; distance: number } | null = null

    for (const item of items) {
        const coordinates: [number, number] = [item.ra > 180 ? item.ra - 360 : item.ra, item.dec]

        if (!Celestial.clip(coordinates)) {
            continue
        }

        const point = Celestial.mapProjection(coordinates)

        if (!point) {
            continue
        }

        const dx = x - point[0]
        const dy = y - point[1]
        const distance = dx * dx + dy * dy

        if (distance < radius * radius && (!best || distance < best.distance)) {
            best = { item, distance }
        }
    }

    return best
}

export type BuiltinHitOptions = {
    starsVisible: boolean
    starsLimit: number
    dsosVisible: boolean
    planetsVisible: boolean
    /** Star catalog positions (loadStarCatalog) */
    stars: CatalogPosition[]
    /** Positions of the currently displayed DSO catalog (loadDsoCatalog) */
    dsos: CatalogPosition[]
    /** Solar-system body positions computed for the selected moment (astronomy-engine) */
    bodies: BodyPosition[]
    /** Meteor radiants currently drawn on the map (already filtered to visible) */
    radiants: MeteorShower[]
}

/**
 * Hit-test the built-in/derived layers, most-specific first: meteor radiants →
 * Sun/Moon/planets → DSOs → stars. Portal objects are checked separately by the
 * caller (they take priority and open the photo popup instead).
 */
export const findBuiltinHit = (x: number, y: number, options: BuiltinHitOptions): BuiltinHit | null => {
    const radiant = scanPositions(options.radiants, x, y, HIT_RADIUS.radiant)

    if (radiant) {
        const { item } = radiant
        return { kind: 'radiant', id: item.id, ra: item.ra, dec: item.dec }
    }

    if (options.planetsVisible) {
        const body = scanPositions(options.bodies, x, y, HIT_RADIUS.body)

        if (body) {
            const { item } = body
            return { kind: item.kind, id: item.body, ra: item.ra, dec: item.dec }
        }
    }

    if (options.dsosVisible) {
        const dso = scanPositions(options.dsos, x, y, HIT_RADIUS.dso)

        if (dso) {
            const { item } = dso
            return { kind: 'dso', id: item.id, ra: item.ra, dec: item.dec, magnitude: item.mag }
        }
    }

    if (options.starsVisible) {
        const visibleStars = options.stars.filter((star) => (star.mag ?? 99) <= options.starsLimit)
        const star = scanPositions(visibleStars, x, y, HIT_RADIUS.star)

        if (star) {
            const { item } = star
            return { kind: 'star', id: item.id, ra: item.ra, dec: item.dec, magnitude: item.mag }
        }
    }

    return null
}
