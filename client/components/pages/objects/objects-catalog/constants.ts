import { CatalogFilters, CatalogSort, SortDirection } from './types'

export const DEFAULT_FILTERS: CatalogFilters = {
    search: '',
    category: undefined,
    status: 'all',
    visibleOnly: false,
    sort: 'name',
    direction: 'asc'
}

/** The direction a column sorts in on its first click: names A→Z, numbers and dates biggest first */
export const DEFAULT_DIRECTION: Record<CatalogSort, SortDirection> = {
    name: 'asc',
    exposure: 'desc',
    frames: 'desc',
    nights: 'desc',
    last: 'desc',
    visibility: 'desc'
}

/** The visibility is recomputed this often: enough for "how high tonight" */
export const VISIBILITY_REFRESH_MS = 10 * 60_000
