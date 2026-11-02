import { useSearchCategoryFilters } from '@/hooks/useSearchCategoryFilters'

import { DEFAULT_FILTERS } from './constants'
import { GalleryFilters } from './types'

/** The gallery's filters: search and category in the URL, the sort in memory */
export const usePhotoFilters = (initialSearch: string, initialCategory?: number) =>
    useSearchCategoryFilters<GalleryFilters>(DEFAULT_FILTERS, { search: initialSearch, category: initialCategory }, [
        'sort'
    ])
