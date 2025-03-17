import { ApiModel, ApiType } from '@/api'
import { encodeQueryData } from '@/api/api'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const APIMeteo = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: 'https://api.meteo.miksoft.pro'
    }),
    endpoints: (builder) => ({
        getCurrent: builder.query<ApiModel.Weather, void>({
            query: () => 'current'
        }),
        getHistory: builder.query<
            ApiType.Weather.ResponseHistory,
            ApiType.Weather.RequestHistory
        >({
            query: (params) => `history${encodeQueryData(params)}`
        })
    }),
    reducerPath: 'APIMeteo'
})
