import { HYDRATE } from 'next-redux-wrapper'

import { RootState } from './store'

import { ApiModel, ApiType } from '@/api'
import { AstroStargazingFormType } from '@/components/astro-stargazing-form'
import type { Action, PayloadAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

type Maybe<T> = T | void

export const encodeQueryData = (data: any): string => {
    const ret = []
    for (const d in data) {
        if (d && data[d]) {
            ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]))
        }
    }

    return ret.length ? '?' + ret.join('&') : ''
}

const isHydrateAction = (action: Action): action is PayloadAction<RootState> => action.type === HYDRATE

export const SITE_LINK = process.env.NEXT_PUBLIC_SITE_LINK

export const HOST_API = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080/'

export const HOST_IMG = process.env.NEXT_PUBLIC_IMG_HOST || HOST_API

export const API = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: HOST_API,
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
        authLoginService: builder.mutation<ApiType.Auth.ResAuthService, ApiType.Auth.ReqAuthService>({
            query: ({ service, ...params }) => `auth/${service}${params?.code ? encodeQueryData(params) : ''}`,
            transformErrorResponse: (response) => response.data
        }),
        authPostLogin: builder.mutation<ApiType.Auth.ResLogin, ApiType.Auth.ReqLogin>({
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
        authorPost: builder.mutation<ApiType.Author.ResSet | ApiType.ResError, Partial<ApiType.Author.ReqSet>>({
            invalidatesTags: () => [{ type: 'Author' }],
            query: ({ ...formState }) => ({
                body: formState,
                method: 'POST',
                url: 'author'
            }),
            transformErrorResponse: (response) => response.data
        }),

        /* Categories Controller */
        categoriesGetList: builder.query<ApiType.Category.Response, void>({
            providesTags: () => [{ id: 'LIST', type: 'Category' }],
            query: () => 'categories'
        }),

        /* Events Controller */
        eventGetItem: builder.query<ApiType.Events.ResItem, string>({
            providesTags: (result, error, id) => [{ id, type: 'Events' }],
            query: (id) => `events/${id}`
        }),
        eventGetPhotoList: builder.query<ApiType.Events.ResponsePhotoList, ApiType.Events.RequestPhotoList>({
            query: (params) => `events/photos${encodeQueryData(params)}`
        }),
        eventGetUpcoming: builder.query<ApiType.Events.ResItem, void>({
            providesTags: () => [{ id: 'UPCOMING', type: 'Events' }],
            query: () => 'events/upcoming'
        }),
        eventPhotoUploadPost: builder.mutation<ApiType.Events.ResponsePhoto, ApiType.Events.ReqUploadPhoto>({
            invalidatesTags: (res, err, arg) => [{ id: arg.eventId, type: 'Events' }],
            query: (data) => ({
                body: data.formData,
                method: 'POST',
                url: `events/upload/${data.eventId}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        eventGetList: builder.query<ApiType.Events.ResList, void>({
            providesTags: () => [{ id: 'LIST', type: 'Events' }],
            query: () => 'events'
        }),

        eventCreatePost: builder.mutation<ApiType.Events.ResItem | ApiType.ResError, FormData>({
            invalidatesTags: () => [{ type: 'Events' }, { type: 'Statistic' }],
            query: (formState) => ({
                body: formState,
                method: 'POST',
                url: 'events'
            }),
            transformErrorResponse: (response) => response.data
        }),
        eventCoverUploadPost: builder.mutation<ApiType.Events.ResItem | ApiType.ResError, FormData>({
            query: (formData) => ({
                body: formData,
                method: 'POST',
                url: `events/${formData.get('id')}/upload`
            }),
            transformErrorResponse: (response) => response.data
        }),
        eventPatch: builder.mutation<ApiType.Events.ResItem | ApiType.ResError, AstroStargazingFormType>({
            invalidatesTags: (result, error, { id }) => [{ id, type: 'Events' }],
            query: ({ id, ...formState }) => ({
                body: formState,
                method: 'PATCH',
                url: `events/${id}`
            }),
            transformErrorResponse: (response) => response.data
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

        /* Objects controller */
        objectsGetList: builder.query<ApiType.Objects.Response, void>({
            providesTags: () => [{ id: 'LIST', type: 'Objects' }],
            query: () => 'objects'
        }),
        objectsGetItem: builder.query<ApiModel.Object, string>({
            providesTags: (res, err, id) => [{ id, type: 'Objects' }],
            query: (id) => `objects/${id}`
        }),
        objectsPatch: builder.mutation<ApiType.Objects.Response | ApiType.ResError, Partial<ApiType.Objects.Request>>({
            invalidatesTags: (result, error, { name }) => [{ id: name, type: 'Events' }],
            query: (formState) => ({
                body: formState,
                method: 'PATCH',
                url: `objects/${formState.name}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        objectsPost: builder.mutation<ApiType.Objects.Response | ApiType.ResError, Partial<ApiType.Objects.Request>>({
            invalidatesTags: () => [{ type: 'Objects' }],
            query: ({ ...formState }) => ({
                body: formState,
                method: 'POST',
                url: 'objects'
            }),
            transformErrorResponse: (response) => response.data
        }),
        objectsDelete: builder.mutation<void, string>({
            invalidatesTags: () => [{ type: 'Objects' }],
            query: (name) => ({
                method: 'DELETE',
                url: `objects/${name}`
            }),
            transformErrorResponse: (response) => response.data
        }),

        /* Files controller */
        filesGetList: builder.query<ApiType.Files.Response, string>({
            providesTags: (res, err, id) => [{ id, type: 'Files' }],
            query: (object) => `files/${object}`
        }),

        /* Equipments controller */
        equipmentsGetList: builder.query<ApiType.Equipment.Response, void>({
            providesTags: () => ['Equipment'],
            query: () => 'equipments'
        }),

        /* Photo Controller */
        photosGetItem: builder.query<ApiModel.Photo, string>({
            providesTags: (res, err, id) => [{ id, type: 'Photos' }],
            query: (id) => `photos/${id}`
        }),
        photosGetList: builder.query<ApiType.Photos.Response, Maybe<ApiType.Photos.Request>>({
            providesTags: () => [{ id: 'LIST', type: 'Photos' }],
            query: (params) => `photos${encodeQueryData(params)}`,
            transformErrorResponse: (response) => response.data
        }),
        photosPost: builder.mutation<ApiType.Photos.PostResponse | ApiType.ResError, ApiType.Photos.PostRequest>({
            invalidatesTags: (result, error, { id }) => [{ id, type: 'Photos' }, { type: 'Statistic' }],
            query: (formState) => ({
                body: formState,
                method: 'POST',
                url: 'photos'
            }),
            transformErrorResponse: (response) => response.data
        }),
        photosPostUpload: builder.mutation<ApiType.Photos.PostResponse | ApiType.ResError, FormData>({
            query: (formData) => ({
                body: formData,
                method: 'POST',
                url: `photos/${formData.get('id')}/upload`
            }),
            transformErrorResponse: (response) => response.data
        }),
        photoPatch: builder.mutation<ApiType.Photos.PostResponse | ApiType.ResError, ApiType.Photos.PostRequest>({
            invalidatesTags: (result, error, { id }) => [{ id, type: 'Photos' }],
            query: ({ id, ...formState }) => ({
                body: formState,
                method: 'PATCH',
                url: `photos/${id}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        photosDelete: builder.mutation<void, string>({
            invalidatesTags: () => [{ type: 'Photos' }],
            query: (id) => ({
                method: 'DELETE',
                url: `photos/${id}`
            }),
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
        relayPutStatus: builder.mutation<ApiType.Relay.ResRelaySet, ApiType.Relay.ReqRelaySet>({
            invalidatesTags: [{ id: 'LIST', type: 'Relay' }],
            query: (data) => ({
                body: data,
                method: 'PUT',
                url: 'relay/set'
            }),
            transformErrorResponse: (response) => response.data
        }),

        /* Sitemap Controller */
        sitemapGetList: builder.query<ApiType.SiteMap.Response, void>({
            query: () => 'sitemap'
        }),

        /* Statistic Controller */
        // statisticGet: builder.query<ApiType.Statistic.ResGeneral, void>({
        //     providesTags: () => ['Statistic'],
        //     query: () => 'statistic'
        // }),
        // statisticGetCatalogItems: builder.query<
        //     ApiType.Statistic.ResCatalogNames,
        //     void
        // >({
        //     providesTags: () => ['Statistic'],
        //     query: () => 'statistic/catalog'
        // }),
        // statisticGetPhotosItems: builder.query<
        //     ApiType.Statistic.ResPhotoNames,
        //     void
        // >({
        //     providesTags: () => ['Statistic'],
        //     query: () => 'statistic/photos'
        // }),
        statisticGetTelescope: builder.query<ApiType.Statistic.ResTelescope, Maybe<ApiType.Statistic.ReqTelescope>>({
            query: (params) => `statistic/telescope${encodeQueryData(params)}`
        })
    }),
    extractRehydrationInfo(action, { reducerPath }): any {
        if (isHydrateAction(action)) {
            return action?.payload?.[reducerPath]
        }
    },
    reducerPath: 'api',
    tagTypes: [
        'Equipment',
        'Files',
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
