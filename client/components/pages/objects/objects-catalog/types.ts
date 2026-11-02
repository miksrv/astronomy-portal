import { ApiModel } from '@/api'
import { ObjectStatus } from '@/utils/objects'
import { Visibility } from '@/utils/visibility'

/** What the catalog page needs of an object: shaped in getServerSideProps to keep the page data small */
export interface CatalogObject {
    name: string
    title: string
    categories: number[]
    ra?: number
    dec?: number
    exposure: number
    frames: number
    /** Exposure per filter only, the shape FilterSpectrum takes */
    filters?: ApiModel.Filters
    nights: number
    lastNight?: string
    photosCount: number
    /** The newest photo, the square `_thumb` size */
    cover?: string
}

export type CatalogStatus = 'all' | ObjectStatus

export type CatalogSort = 'name' | 'exposure' | 'frames' | 'nights' | 'last' | 'visibility'

export type SortDirection = 'asc' | 'desc'

export interface CatalogFilters {
    search: string
    category?: number
    status: CatalogStatus
    visibleOnly: boolean
    sort: CatalogSort
    direction: SortDirection
}

/**
 * Tonight's visibility per object name; `null` for objects that move across the sky (their
 * coordinates are from the shooting date). Absent until computed on the client.
 */
export type CatalogVisibility = Record<string, Visibility | null>
