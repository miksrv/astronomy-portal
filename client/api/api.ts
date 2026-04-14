import { HYDRATE } from 'next-redux-wrapper'
import type { Action, PayloadAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import { ApiModel, ApiType } from '@/api'
import { EventFormType } from '@/components/pages/stargazing'

import { RootState } from './store'

type Maybe<T> = T | void

type QueryParamValue = string | number | boolean | undefined | null

// Accepts objects whose property values are primitive query-string–compatible types.
// We cast to Record internally to iterate since TypeScript does not allow iterating
// over interfaces without an index signature in a generic constraint.
export const encodeQueryData = (data: object | void | undefined): string => {
    if (!data) {
        return ''
    }

    const record = data as Record<string, QueryParamValue>
    const ret = []
    for (const d in record) {
        if (Object.hasOwn(record, d) && record[d] != null) {
            ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(record[d] as string | number | boolean))
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
        authGetMe: builder.query<ApiType.Auth.ResLogin, void>({
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
            providesTags: (result, error, arg) => [{ id: arg.eventId ?? 'LIST', type: 'EventPhotos' }],
            query: (params) => `events/photos${encodeQueryData(params)}`
        }),
        eventGetUsersList: builder.query<ApiType.Events.ResponseUsersList, string>({
            providesTags: (result, error, arg) => [{ id: arg, type: 'EventUsers' }],
            query: (id) => `events/members/${id}`
        }),
        eventGetCheckin: builder.mutation<ApiType.Events.ResCheckin, string>({
            query: (id) => `events/checkin/${id}`,
            transformErrorResponse: (response) => response.data
        }),
        eventGetUpcoming: builder.query<ApiType.Events.ResItem, void>({
            providesTags: () => [{ id: 'UPCOMING', type: 'Events' }],
            query: () => 'events/upcoming'
        }),
        eventPhotoUploadPost: builder.mutation<ApiType.Events.ResponsePhoto, ApiType.Events.ReqUploadPhoto>({
            invalidatesTags: (res, err, arg) => [
                { id: arg.eventId, type: 'Events' },
                { id: arg.eventId, type: 'EventPhotos' }
            ],
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
                url: `events/${formData.get('id') as string}/upload`
            }),
            transformErrorResponse: (response) => response.data
        }),
        eventPatch: builder.mutation<ApiType.Events.ResItem | ApiType.ResError, EventFormType>({
            invalidatesTags: (result, error, { id }) => [{ id, type: 'Events' }],
            query: ({ id, ...formState }) => ({
                body: formState,
                method: 'PATCH',
                url: `events/${id}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        eventDelete: builder.mutation<void, string>({
            invalidatesTags: (result, error, id) => [
                { id, type: 'Events' },
                { id: 'LIST', type: 'Events' }
            ],
            query: (id) => ({
                method: 'DELETE',
                url: `events/${id}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        eventUpdateCover: builder.mutation<
            { coverFileName: string; coverFileExt: string },
            { id: string; formData: FormData }
        >({
            invalidatesTags: (result, error, { id }) => [{ id, type: 'Events' }],
            query: ({ id, formData }) => ({
                body: formData,
                method: 'POST',
                url: `events/${id}/cover`
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
            invalidatesTags: (result, error, { name }) => [
                { id: name, type: 'Objects' },
                { id: 'LIST', type: 'Objects' }
            ],
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
                url: `photos/${formData.get('id') as string}/upload`
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
            providesTags: () => ['Statistic'],
            query: (params) => `statistic/telescope${encodeQueryData(params)}`
        }),

        /* Mailings Controller */
        mailingGetList: builder.query<{ items: ApiModel.MailingListItem[]; count: number }, void>({
            providesTags: () => [{ id: 'LIST', type: 'Mailings' }],
            query: () => 'mailings'
        }),
        mailingGetItem: builder.query<ApiModel.Mailing, string>({
            providesTags: (res, err, id) => [{ id, type: 'Mailings' }],
            query: (id) => `mailings/${id}`
        }),
        mailingCreate: builder.mutation<ApiModel.Mailing, ApiModel.CreateMailingRequest>({
            invalidatesTags: () => [{ type: 'Mailings' }],
            query: (body) => ({
                body,
                method: 'POST',
                url: 'mailings'
            }),
            transformErrorResponse: (response) => response.data
        }),
        mailingUpdate: builder.mutation<ApiModel.Mailing, ApiModel.UpdateMailingRequest & { id: string }>({
            invalidatesTags: (res, err, { id }) => [{ type: 'Mailings' }, { id, type: 'Mailings' }],
            query: ({ id, ...body }) => ({
                body,
                method: 'PATCH',
                url: `mailings/${id}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        mailingDelete: builder.mutation<void, string>({
            invalidatesTags: () => [{ type: 'Mailings' }],
            query: (id) => ({
                method: 'DELETE',
                url: `mailings/${id}`
            }),
            transformErrorResponse: (response) => response.data
        }),
        mailingUploadImage: builder.mutation<{ image: string }, { id: string; formData: FormData }>({
            query: ({ id, formData }) => ({
                body: formData,
                method: 'POST',
                url: `mailings/${id}/upload`
            }),
            transformErrorResponse: (response) => response.data
        }),
        mailingTestSend: builder.mutation<{ success: boolean }, string>({
            query: (id) => ({
                method: 'POST',
                url: `mailings/${id}/test`
            }),
            transformErrorResponse: (response) => response.data
        }),
        mailingLaunch: builder.mutation<{ queued: number }, string>({
            invalidatesTags: (res, err, id) => [{ type: 'Mailings' }, { id, type: 'Mailings' }],
            query: (id) => ({
                method: 'POST',
                url: `mailings/${id}/send`
            }),
            transformErrorResponse: (response) => response.data
        }),
        mailingUnsubscribe: builder.query<{ success: boolean; message: string }, string>({
            query: (mail) => `mailings/unsubscribe?mail=${encodeURIComponent(mail)}`
        })
    }),
    // RTK Query requires the return type of extractRehydrationInfo to match its
    // internal CombinedState shape, which is too complex to express without `any`.
    // Using `unknown` here causes a type mismatch; `any` is the idiomatic RTK pattern.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        'EventPhotos',
        'EventUsers',
        'Photos',
        'Statistic',
        'Category',
        'Relay',
        'Mailings'
    ]
})
