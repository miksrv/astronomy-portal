import { ApiModel, ApiType } from '@/api'
import type { Action, PayloadAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { HYDRATE } from 'next-redux-wrapper'

import { RootState } from './store'

type Maybe<T> = T | void

export const encodeQueryData = (data: any): string => {
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
    process.env.NEXT_PUBLIC_IMG_HOST || process.env.NEXT_PUBLIC_API_HOST

export const API = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080/',
        prepareHeaders: (headers, { getState }) => {
            // By default, if we have a token in the store, let's use that for authenticated requests
            const token = (getState() as RootState).auth.token
            const locale = (getState() as RootState).application.locale

            if (token) {
                headers.set('Authorization', token)
            }

            if (locale) {
                headers.set('Locale', locale)
            }

            return headers
        }
    }),
    endpoints: (builder) => ({
        /* Auth Controller */
        authGetMe: builder.mutation<ApiType.Auth.ResLogin, void>({
            query: () => 'auth/me'
        }),
        authLoginService: builder.mutation<
            ApiType.Auth.ResAuthService,
            ApiType.Auth.ReqAuthService
        >({
            query: ({ service, ...params }) =>
                `auth/${service}${params?.code ? encodeQueryData(params) : ''}`,
            transformErrorResponse: (response) => response.data
        }),
        authPostLogin: builder.mutation<
            ApiType.Auth.ResLogin,
            ApiType.Auth.ReqLogin
        >({
            query: (credentials) => ({
                body: credentials,
                method: 'POST',
                url: 'auth/login'
            }),
            transformErrorResponse: (response) => response.data
        }),

        /* Author Controller */
        authorDelete: builder.mutation<void, number>({
            invalidatesTags: () => [{ type: 'Author' }],
            query: (id) => ({
                method: 'DELETE',
                url: `author/${id}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        authorGetList: builder.query<ApiType.Author.ResList, void>({
            keepUnusedDataFor: 3600,
            providesTags: () => [{ id: 'LIST', type: 'Author' }],
            query: () => 'author'
        }),
        authorPatch: builder.mutation<
            ApiType.Author.ResSet | ApiType.ResError,
            Partial<ApiType.Author.ReqSet> & Pick<ApiType.Author.ReqSet, 'id'>
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
            ApiType.Author.ResSet | ApiType.ResError,
            Partial<ApiType.Author.ReqSet>
        >({
            invalidatesTags: () => [{ type: 'Author' }],
            query: ({ ...formState }) => ({
                body: formState,
                method: 'POST',
                url: 'author'
            }),
            transformErrorResponse: (response) => response.data
        }),

        /* Catalog Controller */
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
        catalogGetItem: builder.query<ApiType.Catalog.ResItem, string>({
            providesTags: (result, error, id) => [{ id, type: 'Catalog' }],
            query: (object) => `catalog/${object}`,
            transformErrorResponse: (response) => response.data
        }),
        catalogGetList: builder.query<ApiType.Catalog.ResList, void>({
            providesTags: () => [{ id: 'LIST', type: 'Catalog' }],
            query: () => 'catalog'
        }),
        catalogPatch: builder.mutation<
            ApiType.Catalog.ResSet | ApiType.ResError,
            Partial<ApiType.Catalog.ReqSet> &
                Pick<ApiType.Catalog.ReqSet, 'name'>
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
            ApiType.Catalog.ResSet | ApiType.ResError,
            Partial<ApiType.Catalog.ReqSet>
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

        /* Category Controller */
        // categoryDelete: builder.mutation<void, number>({
        //     invalidatesTags: () => [{ type: 'Category' }],
        //     query: (id) => ({
        //         method: 'DELETE',
        //         url: `category/${id}`
        //     }),
        //     transformErrorResponse: (response) => response.data
        // }),
        categoriesGetList: builder.query<ApiType.Category.Response, void>({
            providesTags: () => [{ id: 'LIST', type: 'Category' }],
            query: () => 'categories'
        }),

        /* Equipment controller */
        equipmentGetList: builder.query<ApiType.Equipment.Response, void>({
            providesTags: () => [{ id: 'LIST', type: 'Equipment' }],
            query: () => 'equipment'
        }),

        // categoryPatch: builder.mutation<
        //     ApiType.Category.ResSet | ApiType.ResError,
        //     Partial<ApiType.Category.ReqSet> &
        //         Pick<ApiType.Category.ReqSet, 'id'>
        // >({
        //     invalidatesTags: () => [{ type: 'Category' }],
        //     query: ({ id, ...formState }) => ({
        //         body: formState,
        //         method: 'PATCH',
        //         url: `category/${id}`
        //     }),
        //     transformErrorResponse: (response) => response.data
        // }),
        // categoryPost: builder.mutation<
        //     ApiType.Category.ResSet | ApiType.ResError,
        //     Partial<ApiType.Category.ReqSet>
        // >({
        //     invalidatesTags: () => [{ type: 'Category' }],
        //     query: ({ ...formState }) => ({
        //         body: formState,
        //         method: 'POST',
        //         url: 'category'
        //     }),
        //     transformErrorResponse: (response) => response.data
        // }),

        /* Events Controller */
        eventGetItem: builder.query<ApiType.Events.ResItem, string>({
            providesTags: (result, error, id) => [{ id, type: 'Events' }],
            query: (id) => `events/${id}`
        }),
        eventGetUpcoming: builder.query<ApiType.Events.ResItem, void>({
            providesTags: () => [{ id: 'UPCOMING', type: 'Events' }],
            query: () => 'events/upcoming'
        }),
        eventPhotoUploadPost: builder.mutation<
            ApiType.Events.ResUploadPhoto,
            ApiType.Events.ReqUploadPhoto
        >({
            invalidatesTags: (res, err, arg) => [
                { id: arg.eventId, type: 'Events' }
            ],
            query: (data) => ({
                body: data.formData,
                method: 'POST',
                url: `events/upload/${data.eventId}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        eventsCancelRegistrationPost: builder.mutation<
            ApiType.Events.ResRegistration | ApiType.ResError,
            Pick<ApiType.Events.ReqRegistration, 'eventId'>
        >({
            invalidatesTags: () => [{ id: 'UPCOMING', type: 'Events' }],
            query: (formState) => ({
                body: formState,
                method: 'POST',
                url: 'events/cancel'
            }),
            transformErrorResponse: (response) => response.data
        }),
        eventsGetList: builder.query<ApiType.Events.ResList, void>({
            providesTags: () => [{ id: 'LIST', type: 'Events' }],
            query: () => 'events'
        }),
        eventsRegistrationPost: builder.mutation<
            ApiType.Events.ResRegistration | ApiType.ResError,
            ApiType.Events.ReqRegistration
        >({
            invalidatesTags: () => [{ id: 'UPCOMING', type: 'Events' }],
            query: (formState) => ({
                body: formState,
                method: 'POST',
                url: 'events/booking'
            }),
            transformErrorResponse: (response) => response.data
        }),

        /* Objects controller */
        objectsGetList: builder.query<ApiType.Objects.Response, void>({
            providesTags: () => [{ id: 'LIST', type: 'Objects' }],
            query: () => 'objects'
        }),
        objectsGetItem: builder.query<ApiModel.Object, string>({
            providesTags: (res, err, id) => [{ id, type: 'Objects' }],
            query: (id) => `objects/${id}`
        }),

        /* Photo Controller */
        // photoPatch: builder.mutation<
        //     ApiType.Photo.ResSet | ApiType.ResError,
        //     Partial<ApiType.Photo.ReqSet> & Pick<ApiType.Photo.ReqSet, 'id'>
        // >({
        //     invalidatesTags: (result, error, { id }) => [{ id, type: 'Photo' }],
        //     query: ({ id, ...formState }) => ({
        //         body: formState,
        //         method: 'PATCH',
        //         url: `photo/${id}`
        //     }),
        //     transformErrorResponse: (response) => response.data
        // }),
        photosPost: builder.mutation<
            ApiType.Photos.PostResponse | ApiType.ResError,
            ApiType.Photos.PostRequest
        >({
            invalidatesTags: (result, error, { photoId }) => [
                { photoId, type: 'Photos' },
                { type: 'Statistic' }
            ],
            query: (formState) => ({
                body: formState,
                method: 'POST',
                url: 'photos'
            }),
            transformErrorResponse: (response) => response.data
        }),
        // photoPostUpload: builder.mutation<
        //     ApiType.Photo.ResUpload | ApiType.ResError,
        //     FormData
        // >({
        //     query: (formData) => ({
        //         body: formData,
        //         method: 'POST',
        //         url: 'photo/upload'
        //     }),
        //     transformErrorResponse: (response) => response.data
        // }),
        photosGetItem: builder.query<ApiModel.Photo, string>({
            providesTags: (res, err, id) => [{ id, type: 'Photos' }],
            query: (id) => `photos/${id}`
        }),
        photosGetList: builder.query<
            ApiType.Photos.Response,
            Maybe<ApiType.Photos.Request>
        >({
            providesTags: () => [{ id: 'LIST', type: 'Photos' }],
            query: (params) => `photos${encodeQueryData(params)}`,
            transformErrorResponse: (response) => response.data
        }),

        /* Relay Controller */
        relayGetLight: builder.mutation<void, void>({
            invalidatesTags: () => [{ id: 'LIST', type: 'Relay' }],
            query: () => 'relay/light'
        }),
        relayGetState: builder.query<ApiType.Relay.ResRelayList, null>({
            providesTags: () => [{ id: 'LIST', type: 'Relay' }],
            query: () => 'relay/list'
        }),
        relayPutStatus: builder.mutation<
            ApiType.Relay.ResRelaySet,
            ApiType.Relay.ReqRelaySet
        >({
            invalidatesTags: [{ id: 'LIST', type: 'Relay' }],
            query: (data) => ({
                body: data,
                method: 'PUT',
                url: 'relay/set'
            }),
            transformErrorResponse: (response) => response.data
        }),

        /* Statistic Controller */
        statisticGet: builder.query<ApiType.Statistic.ResGeneral, void>({
            providesTags: () => ['Statistic'],
            query: () => 'statistic'
        }),
        statisticGetCatalogItems: builder.query<
            ApiType.Statistic.ResCatalogNames,
            void
        >({
            providesTags: () => ['Statistic'],
            query: () => 'statistic/catalog'
        }),
        statisticGetPhotosItems: builder.query<
            ApiType.Statistic.ResPhotoNames,
            void
        >({
            providesTags: () => ['Statistic'],
            query: () => 'statistic/photos'
        }),
        statisticGetTelescope: builder.query<
            ApiType.Statistic.ResTelescope,
            Maybe<ApiType.Statistic.ReqTelescope>
        >({
            query: (params) => `statistic/telescope${encodeQueryData(params)}`
        }),

        /* Weather Controller */
        weatherGetStatistic: builder.query<
            ApiType.Weather.ResStatistic,
            Maybe<ApiType.Weather.ReqStatistic>
        >({
            query: (params) => `weather/statistic${encodeQueryData(params)}`
        })
    }),
    extractRehydrationInfo(action, { reducerPath }): any {
        if (isHydrateAction(action)) {
            return action.payload[reducerPath]
        }
    },
    reducerPath: 'api',
    tagTypes: [
        'Equipment',
        'Objects',
        'Catalog',
        'Events',
        'Photos',
        'Statistic',
        'Category',
        'Author',
        'Relay'
    ]
})

// Export hooks for usage in functional components
export const {
    useAuthGetMeMutation,
    useAuthorPatchMutation,
    useAuthorPostMutation,
    useStatisticGetQuery
} = API
