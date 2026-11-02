import { GalleryFilters } from './types'

export const DEFAULT_FILTERS: GalleryFilters = {
    search: '',
    category: undefined,
    sort: 'date'
}

/** Tiles that can land on the first screen (two rows of four on desktop) load eagerly */
export const EAGER_PHOTOS_COUNT = 8
