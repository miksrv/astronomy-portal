import { ApiModel } from '@/api'
import { getObjectStatus } from '@/utils/objects'
import { createThumbPhotoUrl } from '@/utils/photos'
import { formatObjectName } from '@/utils/strings'
import { VISIBLE_ALTITUDE } from '@/utils/visibility'

import { CatalogFilters, CatalogObject, CatalogVisibility } from './types'

/**
 * Trims an API object to what the catalog shows. Empty fields are left out rather than set
 * to `undefined`, which getServerSideProps can't serialize.
 */
export const toCatalogObject = (object: ApiModel.Object): CatalogObject => {
    const trimmed: CatalogObject = {
        name: object.name,
        title: object.title,
        categories: object.categories ?? [],
        ra: object.ra,
        dec: object.dec,
        exposure: object.statistic?.exposure ?? 0,
        frames: object.statistic?.frames ?? 0,
        filters: object.filters
            ? Object.fromEntries(Object.entries(object.filters).map(([filter, { exposure }]) => [filter, { exposure }]))
            : undefined,
        nights: object.nights ?? 0,
        lastNight: object.lastNight,
        photosCount: object.photosCount ?? 0,
        cover: object.cover ? createThumbPhotoUrl(object.cover) : undefined
    }

    return Object.fromEntries(Object.entries(trimmed).filter(([, value]) => value != null)) as unknown as CatalogObject
}

/** Matches "M31", "m 31", "NGC7000" and the object's title */
export const matchesSearch = (object: CatalogObject, search: string): boolean => {
    const query = search.trim().toLowerCase()

    if (!query) {
        return true
    }

    const compactQuery = query.replace(/\s+/g, '')

    return (
        formatObjectName(object.name).toLowerCase().includes(query) ||
        object.name
            .toLowerCase()
            .replace(/[_\s-]/g, '')
            .includes(compactQuery) ||
        object.title.toLowerCase().includes(query)
    )
}

/**
 * Filters and sorts the catalog. `visibility` holds tonight's altitude per object name; until
 * it's computed (on the client) the "visible tonight" filter and sort leave the order alone.
 */
export const filterCatalog = (
    objects: CatalogObject[],
    filters: CatalogFilters,
    visibility?: CatalogVisibility
): CatalogObject[] => {
    const sortValue = (object: CatalogObject): number | string => {
        switch (filters.sort) {
            case 'exposure':
                return object.exposure
            case 'frames':
                return object.frames
            case 'nights':
                return object.nights
            case 'last':
                return object.lastNight ?? ''
            case 'visibility':
                return visibility?.[object.name]?.altitude ?? -90
            case 'name':
            default:
                return object.name
        }
    }

    const direction = filters.direction === 'asc' ? 1 : -1

    return objects
        .filter(
            (object) =>
                (!filters.category || object.categories.includes(filters.category)) &&
                (filters.status === 'all' || getObjectStatus(object) === filters.status) &&
                (!filters.visibleOnly ||
                    !visibility ||
                    (visibility[object.name]?.altitude ?? -90) >= VISIBLE_ALTITUDE) &&
                matchesSearch(object, filters.search)
        )
        .sort((a, b) => {
            const x = sortValue(a)
            const y = sortValue(b)

            const result =
                typeof x === 'string' && typeof y === 'string'
                    ? x.localeCompare(y, 'en', { numeric: true, sensitivity: 'base' })
                    : Number(x) - Number(y)

            // Ties fall back to the name, so the order never jumps between renders
            return result * direction || a.name.localeCompare(b.name, 'en', { numeric: true })
        })
}
