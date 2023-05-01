import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { HYDRATE } from 'next-redux-wrapper'

import { RootState } from './store'
import {
    APIRequestBlogList,
    APIRequestBlogListPopular,
    APIRequestCatalog,
    APIRequestLogin,
    APIRequestPhotoList,
    APIRequestTelescope,
    APIRequestWeatherStatistic,
    APIResponseAuthorList,
    APIResponseBlogList,
    APIResponseCatalogList,
    APIResponseCatalogNames,
    APIResponseCategoryList,
    APIResponseError,
    APIResponseLogin,
    APIResponsePhotoList,
    APIResponsePhotoListNames,
    APIResponseStatistic,
    APIResponseStatisticTelescope,
    APIResponseWeatherCurrent,
    APIResponseWeatherStatistic, // IRelayList,
    // IRelaySet,
    IRestAuth,
    TAuthor, // IRestCatalogItem,
    // IRestFilesMonth,
    // IRestNewsList,
    // IRestObjectFiles,
    // IRestObjectItem,
    // IRestObjectList,
    // IRestObjectNames,
    // IRestPhotoList,
    // IRestSensorStatistic,
    // IRestWeatherCurrent,
    // IRestWeatherMonth,
    TCatalog,
    TCategory,
    TPhoto
} from './types'

type Maybe<T> = T | void

// type TQueryNewsList = {
//     limit?: number
//     offset?: number
// }

const encodeQueryData = (data: any): string => {
    const ret = []
    for (let d in data) {
        if (d && data[d]) {
            ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]))
        }
    }

    return ret.length ? '?' + ret.join('&') : ''
}

export const api = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_API_HOST,
        prepareHeaders: (headers, { getState }) => {
            // By default, if we have a token in the store, let's use that for authenticated requests
            const token = (getState() as RootState).auth.userToken

            if (token) {
                headers.set('Authorization', token)
            }

            return headers
        }
    }),
    endpoints: (builder) => ({
        authGetMe: builder.mutation<void, void>({
            query: () => 'auth/me'
        }),
        authPostLogin: builder.mutation<APIResponseLogin, APIRequestLogin>({
            query: (credentials) => ({
                body: credentials,
                method: 'POST',
                url: 'auth/login'
            }),
            transformErrorResponse: (response) => response.data
            // transformResponse: (response: { data: APIResponseLogin }) =>
            //     response.data
        }),

        // getWeatherCurrent: builder.query<IRestWeatherCurrent, null>({
        //     query: () => 'weather/current'
        // }),
        // getWeatherMonth: builder.mutation<IRestWeatherMonth, string>({
        //     query: (date) => `weather/month?date=${date}`
        // }),

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

        blogGetList: builder.query<
            APIResponseBlogList,
            Maybe<APIRequestBlogList>
        >({
            keepUnusedDataFor: 3600,
            query: (params) => `blog${encodeQueryData(params)}`
        }),
        blogGetListPopular: builder.query<
            APIResponseBlogList,
            Maybe<APIRequestBlogListPopular>
        >({
            keepUnusedDataFor: 3600,
            query: (params) => `blog/popular${encodeQueryData(params)}`
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
            query: (object) => `catalog/${object}`
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

        cronGetUpdatePosts: builder.query<void, void>({
            query: () => 'cron/update_telegram_posts'
        }),

        // Коллекция дней за месяц, в которые работала обсерватория (exp, frames, objects)
        // getFilesMonth: builder.mutation<IRestFilesMonth, string>({
        //     query: (date) => `get/statistic/month?date=${date}`
        // }),

        // NEWS
        // Список новостей
        // getNewsList: builder.query<IRestNewsList, TQueryNewsList>({
        //     query: (props) => {
        //         const limit = props.limit ? `?limit=${props.limit}` : ''
        //         const offset = props.offset ? `&offset=${props.offset}` : ''
        //
        //         return `news/list${limit}${offset}`
        //     }
        // }),

        // FILES
        // Список файлов объекта по его имени
        // getObjectFiles: builder.query<IRestObjectFiles, string>({
        //     keepUnusedDataFor: 3600,
        //     query: (name) => `get/file/list?object=${name}`
        // }),

        // getObjectItem: builder.query<IRestObjectItem, string>({
        //     query: (name) => `get/object/item?object=${name}`
        // }),
        // getObjectList: builder.query<IRestObjectList, void>({
        //     keepUnusedDataFor: 3600,
        //     query: () => 'get/object/list'
        // }),
        // getObjectNames: builder.query<IRestObjectNames, void>({
        //     query: () => 'get/object/names'
        // }),
        photoGetItem: builder.query<TPhoto, string>({
            keepUnusedDataFor: 3600,
            query: (object) => `photo/${object}`
        }),

        photoGetList: builder.query<
            APIResponsePhotoList,
            Maybe<APIRequestPhotoList>
        >({
            keepUnusedDataFor: 3600,
            query: (params) => `photo${encodeQueryData(params)}`
        }),

        // getRelayList: builder.query<IRelayList, void>({
        //     keepUnusedDataFor: 3600,
        //     query: () => 'relay/list'
        // }),
        // getRelayState: builder.query<any, null>({
        //     providesTags: () => [{ id: 'LIST', type: 'Relay' }],
        //     query: () => 'relay/state'
        // }),
        // getSensorStatistic: builder.query<IRestSensorStatistic, void>({
        //     query: () => 'get/sensors/statistic'
        // }),
        statisticGet: builder.query<APIResponseStatistic, void>({
            providesTags: () => [{ type: 'Catalog' }],
            query: () => 'statistic'
        }),
        statisticGetCatalogItems: builder.query<APIResponseCatalogNames, void>({
            query: () => 'statistic/catalog'
        }),
        statisticGetPhotosItems: builder.query<APIResponsePhotoListNames, void>(
            {
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

        // setRelayStatus: builder.mutation<IRelayList, IRelaySet>({
        //     invalidatesTags: [{ id: 'LIST', type: 'Relay' }],
        //     query: (data) => ({
        //         body: data,
        //         method: 'POST',
        //         url: 'relay/set'
        //     })
        // })
    }),
    extractRehydrationInfo(action, { reducerPath }) {
        if (action.type === HYDRATE) {
            return action.payload[reducerPath]
        }
    },
    reducerPath: 'api',
    tagTypes: ['Catalog', 'Statistic', 'Category', 'Author']
})

// Export hooks for usage in functional components
export const {
    useAuthGetMeMutation,
    useAuthPostLoginMutation,

    useAuthorDeleteMutation,
    useAuthorGetListQuery,
    useAuthorPatchMutation,
    useAuthorPostMutation,

    useBlogGetListQuery,
    useBlogGetListPopularQuery,

    useCatalogDeleteMutation,
    useCatalogGetItemQuery,
    useCatalogGetListQuery,
    useCatalogPatchMutation,
    useCatalogPostMutation,

    useCategoryDeleteMutation,
    useCategoryGetListQuery,
    useCategoryPatchMutation,
    useCategoryPostMutation,

    // useCronGetUpdatePostsQuery,

    usePhotoGetItemQuery,
    usePhotoGetListQuery,

    useStatisticGetQuery,
    useStatisticGetCatalogItemsQuery,
    useStatisticGetPhotosItemsQuery,
    useStatisticGetTelescopeQuery,

    // useWeatherGetCurrentQuery,
    useWeatherGetStatisticQuery,

    util: { getRunningQueriesThunk }
} = api

// export endpoints for use in SSR
export const {
    catalogGetList,
    catalogGetItem,
    photoGetList,
    statisticGetCatalogItems,
    statisticGetPhotosItems
} = api.endpoints
