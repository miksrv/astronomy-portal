import type { QueryCacheKey } from '@reduxjs/toolkit/query'

import { API } from '@/api'
import type { AppStore } from '@/api/store'

type EndpointName = keyof typeof API.endpoints

/**
 * Drops the RTK Query cache entries of the given endpoints from a
 * `getServerSideProps` store, for data that's already handed to the page as
 * props. next-redux-wrapper serializes the whole store into `__NEXT_DATA__`, so
 * a list that's both returned as a prop and left in the cache would ship to the
 * browser twice. Only for endpoints whose SSR-fetched entry no client hook on
 * the page reads - otherwise that hook would refetch after hydration.
 */
export const removeSSRQueryCache = (store: AppStore, endpoints: EndpointName[]) => {
    const queries = store.getState()[API.reducerPath].queries

    Object.entries(queries).forEach(([queryCacheKey, entry]) => {
        if (entry && endpoints.includes(entry.endpointName as EndpointName)) {
            store.dispatch(API.internalActions.removeQueryResult({ queryCacheKey: queryCacheKey as QueryCacheKey }))
        }
    })
}
