import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export type Weather = {
    date?: string
    temperature?: number
    feelsLike?: number
    pressure?: number
    humidity?: number
    dewPoint?: number
    visibility?: number
    uvIndex?: number
    solEnergy?: number
    solRadiation?: number
    clouds?: number
    precipitation?: number
    windSpeed?: number
    windGust?: number
    windDeg?: number
    weatherId?: number
}

export const APIMeteo = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: 'https://api.meteo.miksoft.pro'
    }),
    endpoints: (builder) => ({
        getCurrent: builder.query<Weather, void>({
            query: () => 'current'
        })
    }),
    reducerPath: 'APIMeteo'
})
