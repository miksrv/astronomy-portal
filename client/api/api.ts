import { HYDRATE } from 'next-redux-wrapper'
import type { Action, PayloadAction } from '@reduxjs/toolkit'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import { ApiModel, ApiType } from '@/api'
import { HOST_API } from '@/utils/constants'
import { encodeQueryData } from '@/utils/helpers'

import { RootState } from './store'

type Maybe<T> = T | void

const isHydrateAction = (action: Action): action is PayloadAction<RootState> => action.type === HYDRATE

const rawBaseQuery = fetchBaseQuery({
    baseUrl: HOST_API,
    prepareHeaders: (headers, { getState }) => {
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
})

const baseQueryWithErrorTransform = (async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions)
    if (result.error && 'data' in result.error) {
        return { ...result, error: (result.error as FetchBaseQueryError).data }
    }
    return result
}) as BaseQueryFn<string | FetchArgs, unknown, ApiType.ResError>

export const API = createApi({
    baseQuery: baseQueryWithErrorTransform,
    endpoints: (builder) => ({
        /* Comments Controller */
        commentsGetList: builder.query<ApiType.Comments.ResList, ApiType.Comments.ReqList>({
            providesTags: (result, error, { entityId }) => [{ id: entityId, type: 'Comments' }],
            query: (params) => `comments${encodeQueryData(params)}`
        }),
        commentsGetRandom: builder.query<ApiType.Comments.ResRandom, ApiType.Comments.ReqRandom>({
            providesTags: ['Comments'],
            query: (params) => `comments/random${encodeQueryData(params)}`
        }),
        commentsCreate: builder.mutation<ApiModel.Comment, ApiType.Comments.ReqCreate>({
            invalidatesTags: (result, error, { entityId }) => [{ id: entityId, type: 'Comments' }, 'Comments'],
            query: (body) => ({ body, method: 'POST', url: 'comments' })
        }),
        commentsDelete: builder.mutation<void, string>({
            invalidatesTags: ['Comments'],
            query: (id) => ({ method: 'DELETE', url: `comments/${id}` })
        }),

        /* Auth Controller */
        authGetMe: builder.query<ApiType.Auth.ResLogin, void>({
            providesTags: ['Auth'],
            query: () => 'auth/me'
        }),
        authLoginService: builder.mutation<ApiType.Auth.ResAuthService, ApiType.Auth.ReqAuthService>({
            query: ({ service, ...params }) => `auth/${service}${params?.code ? encodeQueryData(params) : ''}`
        }),
        authPostLogin: builder.mutation<ApiType.Auth.ResLogin, ApiType.Auth.ReqLogin>({
            query: (credentials) => ({
                body: credentials,
                method: 'POST',
                url: 'auth/login'
            })
        }),
        authUpdateProfile: builder.mutation<ApiType.Auth.ResUpdateProfile, ApiType.Auth.ReqUpdateProfile>({
            invalidatesTags: ['Auth'],
            query: (body) => ({ body, method: 'PATCH', url: 'auth/profile' })
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
        eventGetPhotoList: builder.query<ApiType.Events.ResPhotoList, ApiType.Events.ReqPhotoList>({
            providesTags: (result, error, arg) => [{ id: arg.eventId ?? 'LIST', type: 'EventPhotos' }],
            query: (params) => `events/photos${encodeQueryData(params)}`
        }),
        eventGetUsersList: builder.query<ApiType.Events.ResUsersList, string>({
            providesTags: (result, error, arg) => [{ id: arg, type: 'EventUsers' }],
            query: (id) => `events/members/${id}`
        }),
        eventGetStatistic: builder.query<ApiType.Events.ResEventStatistic, string>({
            query: (id) => `events/${id}/statistic`
        }),
        eventGetCheckin: builder.mutation<ApiType.Events.ResCheckin, string>({
            query: (id) => `events/checkin/${id}`
        }),
        eventGetUpcoming: builder.query<ApiType.Events.ResItem, void>({
            providesTags: () => [{ id: 'UPCOMING', type: 'Events' }],
            query: () => 'events/upcoming'
        }),
        eventGetUpcomingRegistered: builder.query<ApiType.Auth.ResUpcomingEvent, void>({
            providesTags: [{ id: 'UPCOMING_PROFILE', type: 'Events' }],
            query: () => 'events/upcoming/registered'
        }),
        eventPhotoUploadPost: builder.mutation<ApiType.Events.ResPhoto, ApiType.Events.ReqUploadPhoto>({
            invalidatesTags: (res, err, arg) => [
                { id: arg.eventId, type: 'Events' },
                { id: arg.eventId, type: 'EventPhotos' }
            ],
            query: (data) => ({
                body: data.formData,
                method: 'POST',
                url: `events/upload/${data.eventId}`
            })
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
            })
        }),
        eventCoverUploadPost: builder.mutation<ApiType.Events.ResItem | ApiType.ResError, FormData>({
            query: (formData) => ({
                body: formData,
                method: 'POST',
                url: `events/${formData.get('id') as string}/upload`
            })
        }),
        eventPatch: builder.mutation<ApiType.Events.ResItem | ApiType.ResError, ApiType.Events.EventFormType>({
            invalidatesTags: (result, error, { id }) => [{ id, type: 'Events' }],
            query: ({ id, ...formState }) => ({
                body: formState,
                method: 'PATCH',
                url: `events/${id}`
            })
        }),
        eventDelete: builder.mutation<void, string>({
            invalidatesTags: (result, error, id) => [
                { id, type: 'Events' },
                { id: 'LIST', type: 'Events' }
            ],
            query: (id) => ({
                method: 'DELETE',
                url: `events/${id}`
            })
        }),
        eventUpdateCover: builder.mutation<ApiType.Events.ResUpdateCover, ApiType.Events.ReqUpdateCover>({
            invalidatesTags: (result, error, { id }) => [{ id, type: 'Events' }],
            query: ({ id, formData }) => ({
                body: formData,
                method: 'POST',
                url: `events/${id}/cover`
            })
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
            })
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
            })
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
            })
        }),
        objectsPost: builder.mutation<ApiType.Objects.Response | ApiType.ResError, Partial<ApiType.Objects.Request>>({
            invalidatesTags: () => [{ type: 'Objects' }],
            query: ({ ...formState }) => ({
                body: formState,
                method: 'POST',
                url: 'objects'
            })
        }),
        objectsDelete: builder.mutation<void, string>({
            invalidatesTags: () => [{ type: 'Objects' }],
            query: (name) => ({
                method: 'DELETE',
                url: `objects/${name}`
            })
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
            query: (params) => `photos${encodeQueryData(params)}`
        }),
        photosPost: builder.mutation<ApiType.Photos.PostResponse | ApiType.ResError, ApiType.Photos.PostRequest>({
            invalidatesTags: (result, error, { id }) => [{ id, type: 'Photos' }, { type: 'Statistic' }],
            query: (formState) => ({
                body: formState,
                method: 'POST',
                url: 'photos'
            })
        }),
        photosPostUpload: builder.mutation<ApiType.Photos.PostResponse | ApiType.ResError, FormData>({
            query: (formData) => ({
                body: formData,
                method: 'POST',
                url: `photos/${formData.get('id') as string}/upload`
            })
        }),
        photoPatch: builder.mutation<ApiType.Photos.PostResponse | ApiType.ResError, ApiType.Photos.PostRequest>({
            invalidatesTags: (result, error, { id }) => [{ id, type: 'Photos' }],
            query: ({ id, ...formState }) => ({
                body: formState,
                method: 'PATCH',
                url: `photos/${id}`
            })
        }),
        photosDelete: builder.mutation<void, string>({
            invalidatesTags: () => [{ type: 'Photos' }],
            query: (id) => ({
                method: 'DELETE',
                url: `photos/${id}`
            })
        }),

        /* Relay Controller */
        relayToggleLight: builder.mutation<void, void>({
            invalidatesTags: () => [{ id: 'LIST', type: 'Relay' }],
            query: () => 'relay/light'
        }),
        relayGetState: builder.query<ApiType.Relay.ResRelayList, void>({
            providesTags: () => [{ id: 'LIST', type: 'Relay' }],
            query: () => 'relay/list'
        }),
        relayPutStatus: builder.mutation<ApiType.Relay.ResRelaySet, ApiType.Relay.ReqRelaySet>({
            invalidatesTags: [{ id: 'LIST', type: 'Relay' }],
            query: (data) => ({
                body: data,
                method: 'PUT',
                url: 'relay/set'
            })
        }),

        /* Sitemap Controller */
        sitemapGetList: builder.query<ApiType.SiteMap.Response, void>({
            query: () => 'sitemap'
        }),

        /* Statistic Controller */
        statisticGetTelescope: builder.query<ApiType.Statistic.ResTelescope, Maybe<ApiType.Statistic.ReqTelescope>>({
            providesTags: () => ['Statistic'],
            query: (params) => `statistic/telescope${encodeQueryData(params)}`
        }),

        /* Mailings Controller */
        mailingGetList: builder.query<ApiType.Mailings.ResMailingList, void>({
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
            })
        }),
        mailingUpdate: builder.mutation<ApiModel.Mailing, ApiModel.UpdateMailingRequest & { id: string }>({
            invalidatesTags: (res, err, { id }) => [{ type: 'Mailings' }, { id, type: 'Mailings' }],
            query: ({ id, ...body }) => ({
                body,
                method: 'PATCH',
                url: `mailings/${id}`
            })
        }),
        mailingDelete: builder.mutation<void, string>({
            invalidatesTags: () => [{ type: 'Mailings' }],
            query: (id) => ({
                method: 'DELETE',
                url: `mailings/${id}`
            })
        }),
        mailingUploadImage: builder.mutation<ApiType.Mailings.ResMailingUpload, ApiType.Mailings.ReqMailingUpload>({
            query: ({ id, formData }) => ({
                body: formData,
                method: 'POST',
                url: `mailings/${id}/upload`
            })
        }),
        mailingTestSend: builder.mutation<ApiType.Mailings.ResMailingTestSend, string>({
            query: (id) => ({
                method: 'POST',
                url: `mailings/${id}/test`
            })
        }),
        mailingLaunch: builder.mutation<ApiType.Mailings.ResMailingLaunch, string>({
            invalidatesTags: (res, err, id) => [{ type: 'Mailings' }, { id, type: 'Mailings' }],
            query: (id) => ({
                method: 'POST',
                url: `mailings/${id}/send`
            })
        }),
        mailingUnsubscribe: builder.query<ApiType.Mailings.ResMailingUnsubscribe, string>({
            query: (mail) => `mailings/unsubscribe?mail=${encodeURIComponent(mail)}`
        }),
        mailingGetAudiences: builder.query<ApiType.Mailings.ResMailingAudiences, void>({
            query: () => 'mailings/audiences'
        }),

        /* Members Controller */
        usersGetList: builder.query<ApiType.Users.UsersListResponse, ApiType.Users.UsersListRequest>({
            providesTags: () => [{ id: 'LIST', type: 'Users' }],
            query: (params) => `members${encodeQueryData(params)}`
        }),
        usersGetEvents: builder.query<ApiType.Users.UserEventsResponse, string>({
            providesTags: (res, err, id) => [{ id, type: 'Users' }],
            query: (id) => `members/${id}/events`
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
        'Auth',
        'Comments',
        'Equipment',
        'Files',
        'Objects',
        'Events',
        'EventPhotos',
        'EventUsers',
        'Photos',
        'Statistic',
        'Category',
        'Relay',
        'Mailings',
        'Users'
    ]
})
