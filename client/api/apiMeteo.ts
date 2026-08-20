import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import { ApiModel, ApiType } from '@/api'
import { HOST_METEO_API } from '@/utils/constants'
import { encodeQueryData } from '@/utils/helpers'

export const APIMeteo = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: HOST_METEO_API
    }),
    endpoints: (builder) => ({
        getCurrent: builder.query<ApiModel.Weather, void>({
            query: () => 'current'
        }),
        getHistory: builder.query<ApiType.Weather.ResponseHistory, ApiType.Weather.RequestHistory>({
            query: (params) => `history${encodeQueryData(params)}`
        }),
        getForecastDaily: builder.query<ApiType.Weather.ResponseForecastDaily, void>({
            query: () => 'forecast/daily'
        })
    }),
    reducerPath: 'APIMeteo'
})
