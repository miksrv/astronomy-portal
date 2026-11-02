import { HYDRATE } from 'next-redux-wrapper'
import { Action, PayloadAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import { ApiModel, ApiType } from '@/api'
import { HOST_METEO_API } from '@/utils/constants'
import { encodeQueryData } from '@/utils/helpers'

const isHydrateAction = (action: Action): action is PayloadAction<Record<string, unknown>> => action.type === HYDRATE

export const APIMeteo = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: HOST_METEO_API,
        // On the server the observatory page waits for these requests before any HTML goes out
        // (the station answers in ~1 s): a hanging station fails fast and the page renders
        // without the weather, the client hooks retry. The browser is given longer
        timeout: typeof window === 'undefined' ? 3000 : 15_000
    }),
    // Same as `API`: pick the weather prefetched in getServerSideProps (the observatory page)
    // out of the HYDRATE payload, so the client hooks start with data instead of refetching.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extractRehydrationInfo(action, { reducerPath }): any {
        if (isHydrateAction(action)) {
            return action.payload?.[reducerPath]
        }
    },
    endpoints: (builder) => ({
        getCurrent: builder.query<ApiModel.Weather, void>({
            query: () => 'current'
        }),
        getHistory: builder.query<ApiType.Weather.ResponseHistory, ApiType.Weather.RequestHistory>({
            query: (params) => `history${encodeQueryData(params)}`
        }),
        getForecastDaily: builder.query<ApiType.Weather.ResponseForecastDaily, void>({
            query: () => 'forecast/daily'
        }),
        // 48 hours ahead, one entry per hour
        getForecastHourly: builder.query<ApiType.Weather.ResponseForecastHourly, void>({
            query: () => 'forecast/hourly'
        })
    }),
    reducerPath: 'APIMeteo'
})
