import { useCallback, useEffect, useRef, useState } from 'react'

import { useRouter } from 'next/router'

import { useDebouncedValue } from '@/hooks/useDebouncedValue'

/** The two filters every list page keeps in its URL */
export interface SearchCategoryFilters {
    search: string
    category?: number
}

const parseCategory = (value?: string | string[]): number | undefined => {
    const category = typeof value === 'string' ? parseInt(value) : NaN

    return Number.isNaN(category) ? undefined : category
}

/**
 * The filters of a list page (the objects catalog, the photo gallery). Search and category live
 * in the URL too (`?search=&category=`), so a filtered list can be linked to and the
 * WebSite/SearchAction structured data keeps working; the URL is updated shallowly, as the
 * filtering itself happens on the client. Back/Forward moves between categories; the search is
 * part of the current entry. Other fields of `T` (sort, toggles) stay in memory.
 *
 * @param defaults - Every filter's default; `reset()` restores them all but the ones in `keepOnReset`
 */
export const useSearchCategoryFilters = <T extends SearchCategoryFilters>(
    defaults: T,
    initial: Partial<T>,
    keepOnReset: Array<keyof T> = []
) => {
    const router = useRouter()

    const [filters, setFilters] = useState<T>({ ...defaults, ...initial })

    const [debouncedSearch] = useDebouncedValue(filters.search, 400)

    // The URL this hook wrote itself: echoing it back into the state would overwrite
    // what has been typed since the debounce fired
    const writtenQuery = useRef<string>(undefined)

    const updateFilters = useCallback((patch: Partial<T>) => {
        setFilters((current) => ({ ...current, ...patch }))
    }, [])

    const resetFilters = useCallback(() => {
        setFilters((current) => {
            const kept = Object.fromEntries(keepOnReset.map((key) => [key, current[key]])) as Partial<T>

            return { ...defaults, ...kept }
        })
        // `defaults` and `keepOnReset` are constants of the page
    }, [])

    // Back/Forward and links to another filter on the same page change only the URL
    useEffect(() => {
        const search = (router.query.search as string) || ''
        const category = parseCategory(router.query.category)

        // The echo of our own navigation: consume it once, so a later Back/Forward to the same
        // URL is applied again
        if (writtenQuery.current === `${search}|${category ?? ''}`) {
            writtenQuery.current = undefined

            return
        }

        setFilters((current) =>
            current.category === category && current.search.trim() === search.trim()
                ? current
                : { ...current, search, category }
        )
    }, [router.query.search, router.query.category])

    useEffect(() => {
        // Back/Forward has just replaced the search: the debounced copy still holds the old one
        // for a moment, and writing it now would put the old search back into the new URL
        if (debouncedSearch !== filters.search) {
            return
        }

        const search = debouncedSearch?.trim() || undefined
        const urlSearch = (router.query.search as string) || undefined
        const urlCategory = parseCategory(router.query.category)

        if (search === urlSearch && filters.category === urlCategory) {
            return
        }

        const query: Record<string, string | number> = {}

        if (search) {
            query.search = search
        }

        if (filters.category) {
            query.category = filters.category
        }

        writtenQuery.current = `${search ?? ''}|${filters.category ?? ''}`

        // A new category is a new list worth a history entry (Back returns to the previous one);
        // typing a search only rewrites the current entry, so every letter doesn't pile up
        const navigate = filters.category !== urlCategory ? router.push : router.replace

        void navigate({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false })
    }, [debouncedSearch, filters.search, filters.category])

    return { filters, updateFilters, resetFilters }
}
