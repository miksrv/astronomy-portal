import type { Action, PayloadAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { HYDRATE } from 'next-redux-wrapper'

import { RootState } from './store'
import {
    APIRequestCatalog,
    APIRequestLogin,
    APIRequestPhoto,
    APIRequestPhotoList,
    APIRequestRelaySet,
    APIRequestTelescope,
    APIRequestWeatherStatistic,
    APIResponseAuthorList,
    APIResponseCatalogList,
    APIResponseCatalogNames,
    APIResponseCategoryList,
    APIResponseError,
    APIResponseLogin,
    APIResponsePhotoList,
    APIResponsePhotoListNames,
    APIResponseRelayList,
    APIResponseRelaySet,
    APIResponseStatistic,
    APIResponseStatisticTelescope,
    APIResponseUploadPhoto,
    APIResponseWeatherCurrent,
    APIResponseWeatherStatistic,
    TAuthor,
    TCatalog,
    TCategory,
    TPhoto
} from './types'

type Maybe<T> = T | void

const encodeQueryData = (data: any): string => {
    const ret = []
    for (let d in data) {
        if (d && data[d]) {
            ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]))
        }
    }

    return ret.length ? '?' + ret.join('&') : ''
}

const isHydrateAction = (action: Action): action is PayloadAction<RootState> =>
    action.type === HYDRATE

export const imageHost =
    process.env.NEXT_PUBLIC_IMG_HOST ||
    process.env.NEXT_PUBLIC_API_HOST ||
    'http://localhost/'

export const api = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080/',
        prepareHeaders: (headers, { getState }) => {
            // By default, if we have a token in the store, let's use that for authenticated requests
            const token = (getState() as RootState).auth.token

            if (token) {
                headers.set('Authorization', token)
            }

            return headers
        }
    }),
    endpoints: (builder) => ({
        authGetMe: builder.mutation<APIResponseLogin, void>({
            query: () => 'auth/me'
        }),
        authPostLogin: builder.mutation<APIResponseLogin, APIRequestLogin>({
            query: (credentials) => ({
                body: credentials,
                method: 'POST',
                url: 'auth/login'
            }),
            transformErrorResponse: (response) => response.data
        }),

        authorDelete: builder.mutation<void, number>({
            invalidatesTags: () => [{ type: 'Author' }],
            query: (id) => ({
                method: 'DELETE',
                url: `author/${id}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        authorGetList: builder.query<APIResponseAuthorList, void>({
            keepUnusedDataFor: 3600,
            providesTags: () => [{ id: 'LIST', type: 'Author' }],
            query: () => 'author'
        }),
        authorPatch: builder.mutation<
            TAuthor | APIResponseError,
            Partial<TAuthor> & Pick<TAuthor, 'id'>
        >({
            invalidatesTags: () => [{ type: 'Author' }],
            query: ({ id, ...formState }) => ({
                body: formState,
                method: 'PATCH',
                url: `author/${id}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        authorPost: builder.mutation<
            TAuthor | APIResponseError,
            Partial<TAuthor>
        >({
            invalidatesTags: () => [{ type: 'Author' }],
            query: ({ ...formState }) => ({
                body: formState,
                method: 'POST',
                url: 'author'
            }),
            transformErrorResponse: (response) => response.data
        }),

        catalogDelete: builder.mutation<void, string>({
            invalidatesTags: (result, error, object) => [
                { object, type: 'Catalog' },
                { type: 'Statistic' }
            ],
            query: (object) => ({
                method: 'DELETE',
                url: `catalog/${object}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        catalogGetItem: builder.query<TCatalog, string>({
            providesTags: (result, error, id) => [{ id, type: 'Catalog' }],
            query: (object) => `catalog/${object}`,
            transformErrorResponse: (response) => response.data
        }),
        catalogGetList: builder.query<APIResponseCatalogList, void>({
            providesTags: () => [{ id: 'LIST', type: 'Catalog' }],
            query: () => 'catalog'
        }),
        catalogPatch: builder.mutation<
            TCatalog | APIResponseError,
            Partial<APIRequestCatalog> & Pick<APIRequestCatalog, 'name'>
        >({
            invalidatesTags: (result, error, { name }) => [
                { name, type: 'Catalog' }
            ],
            query: ({ name, ...formState }) => ({
                body: formState,
                method: 'PATCH',
                url: `catalog/${name}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        catalogPost: builder.mutation<
            TCatalog | APIResponseError,
            Partial<APIRequestCatalog>
        >({
            invalidatesTags: (result, error, { name }) => [
                { name, type: 'Catalog' },
                { type: 'Statistic' }
            ],
            query: ({ ...formState }) => ({
                body: formState,
                method: 'POST',
                url: 'catalog'
            }),
            transformErrorResponse: (response) => response.data
        }),

        categoryDelete: builder.mutation<void, number>({
            invalidatesTags: () => [{ type: 'Category' }],
            query: (id) => ({
                method: 'DELETE',
                url: `category/${id}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        categoryGetList: builder.query<APIResponseCategoryList, void>({
            keepUnusedDataFor: 3600,
            providesTags: () => [{ id: 'LIST', type: 'Category' }],
            query: () => 'category'
        }),
        categoryPatch: builder.mutation<
            TCategory | APIResponseError,
            Partial<TCategory> & Pick<TCategory, 'id'>
        >({
            invalidatesTags: () => [{ type: 'Category' }],
            query: ({ id, ...formState }) => ({
                body: formState,
                method: 'PATCH',
                url: `category/${id}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        categoryPost: builder.mutation<
            TCategory | APIResponseError,
            Partial<TCategory>
        >({
            invalidatesTags: () => [{ type: 'Category' }],
            query: ({ ...formState }) => ({
                body: formState,
                method: 'POST',
                url: 'category'
            }),
            transformErrorResponse: (response) => response.data
        }),

        photoGetItem: builder.query<TPhoto, string>({
            keepUnusedDataFor: 3600,
            query: (object) => `photo/${object}`
        }),
        photoGetList: builder.query<
            APIResponsePhotoList,
            Maybe<APIRequestPhotoList>
        >({
            keepUnusedDataFor: 3600,
            providesTags: () => ['Photo'],
            query: (params) => `photo${encodeQueryData(params)}`,
            transformErrorResponse: (response) => response.data
        }),
        photoPatch: builder.mutation<
            TPhoto | APIResponseError,
            Partial<APIRequestPhoto> & Pick<APIRequestPhoto, 'id'>
        >({
            invalidatesTags: (result, error, { id }) => [{ id, type: 'Photo' }],
            query: ({ id, ...formState }) => ({
                body: formState,
                method: 'PATCH',
                url: `photo/${id}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        photoPost: builder.mutation<
            TPhoto | APIResponseError,
            Partial<APIRequestPhoto>
        >({
            invalidatesTags: (result, error, { object }) => [
                { object, type: 'Photo' },
                { type: 'Statistic' }
            ],
            query: ({ ...formState }) => ({
                body: formState,
                method: 'POST',
                url: 'photo'
            }),
            transformErrorResponse: (response) => response.data
        }),
        photoPostUpload: builder.mutation<
            APIResponseUploadPhoto | APIResponseError,
            FormData
        >({
            query: (formData) => ({
                body: formData,
                method: 'POST',
                url: 'photo/upload'
            }),
            transformErrorResponse: (response) => response.data
        }),

        relayGetLight: builder.mutation<void, void>({
            invalidatesTags: () => [{ id: 'LIST', type: 'Relay' }],
            query: () => 'relay/light'
        }),
        relayGetState: builder.query<APIResponseRelayList, null>({
            providesTags: () => [{ id: 'LIST', type: 'Relay' }],
            query: () => 'relay/list'
        }),
        relayPutStatus: builder.mutation<
            APIResponseRelaySet,
            APIRequestRelaySet
        >({
            invalidatesTags: [{ id: 'LIST', type: 'Relay' }],
            query: (data) => ({
                body: data,
                method: 'PUT',
                url: 'relay/set'
            }),
            transformErrorResponse: (response) => response.data
        }),

        statisticGet: builder.query<APIResponseStatistic, void>({
            providesTags: () => ['Statistic'],
            query: () => 'statistic'
        }),
        statisticGetCatalogItems: builder.query<APIResponseCatalogNames, void>({
            providesTags: () => ['Statistic'],
            query: () => 'statistic/catalog'
        }),
        statisticGetPhotosItems: builder.query<APIResponsePhotoListNames, void>(
            {
                providesTags: () => ['Statistic'],
                query: () => 'statistic/photos'
            }
        ),
        statisticGetTelescope: builder.query<
            APIResponseStatisticTelescope,
            Maybe<APIRequestTelescope>
        >({
            query: (params) => `statistic/telescope${encodeQueryData(params)}`
        }),

        weatherGetCurrent: builder.query<APIResponseWeatherCurrent, void>({
            query: () => 'weather/current'
        }),
        weatherGetStatistic: builder.query<
            APIResponseWeatherStatistic,
            Maybe<APIRequestWeatherStatistic>
        >({
            query: (params) => `weather/statistic${encodeQueryData(params)}`
        })
        // getSensorStatistic: builder.query<IRestSensorStatistic, void>({
        //     query: () => 'get/sensors/statistic'
        // }),
    }),
    extractRehydrationInfo(action, { reducerPath }): any {
        if (isHydrateAction(action)) {
            return action.payload[reducerPath]
        }
    },
    reducerPath: 'api',
    tagTypes: ['Catalog', 'Photo', 'Statistic', 'Category', 'Author', 'Relay']
})

// Export hooks for usage in functional components
export const {
    useAuthGetMeMutation,
    useAuthPostLoginMutation,

    useAuthorDeleteMutation,
    useAuthorGetListQuery,
    useAuthorPatchMutation,
    useAuthorPostMutation,

    useCatalogDeleteMutation,
    useCatalogGetItemQuery,
    useCatalogGetListQuery,
    useCatalogPatchMutation,
    useCatalogPostMutation,

    useCategoryDeleteMutation,
    useCategoryGetListQuery,
    useCategoryPatchMutation,
    useCategoryPostMutation,

    usePhotoGetListQuery,
    usePhotoPatchMutation,
    usePhotoPostMutation,
    usePhotoPostUploadMutation,

    useRelayGetLightMutation,
    useRelayGetStateQuery,
    useRelayPutStatusMutation,

    useStatisticGetQuery,
    useStatisticGetCatalogItemsQuery,
    useStatisticGetPhotosItemsQuery,
    useStatisticGetTelescopeQuery,

    useWeatherGetCurrentQuery,
    useWeatherGetStatisticQuery,

    util: { getRunningQueriesThunk }
} = api

// export endpoints for use in SSR
export const {
    authorGetList,
    catalogGetList,
    catalogGetItem,
    categoryGetList,
    photoGetList,
    statisticGetCatalogItems,
    statisticGetPhotosItems
} = api.endpoints
