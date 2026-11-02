import { useSearchCategoryFilters } from '@/hooks/useSearchCategoryFilters'

import { DEFAULT_FILTERS } from './constants'
import { CatalogFilters } from './types'

/** The catalog's filters: search and category in the URL, sort and the status toggles in memory */
export const useCatalogFilters = (initialSearch: string, initialCategory?: number) =>
    useSearchCategoryFilters<CatalogFilters>(DEFAULT_FILTERS, { search: initialSearch, category: initialCategory }, [
        'sort',
        'direction'
    ])
