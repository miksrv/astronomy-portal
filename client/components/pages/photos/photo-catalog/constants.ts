import { GalleryFilters } from './types'

export const DEFAULT_FILTERS: GalleryFilters = {
    search: '',
    category: undefined,
    sort: 'date'
}

/** Tiles that can land on the first screen (two rows of four on desktop) load eagerly */
export const EAGER_PHOTOS_COUNT = 8

/**
 * Tiles rendered at once. The whole gallery in the server HTML was 500 KB of markup for
 * 175 tiles; a page of 48 covers 12 rows on desktop, the rest come with a click
 */
export const PHOTOS_PAGE_SIZE = 48
