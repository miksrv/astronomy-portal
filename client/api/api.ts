import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { HYDRATE } from 'next-redux-wrapper'

import { RootState } from './store'
import {
    APIRequestCatalog,
    APIRequestCategories,
    APIRequestLogin,
    APIRequestPhotos,
    APIResponseCatalogList,
    APIResponseCatalogNames,
    APIResponseError,
    APIResponseLogin,
    APIResponsePhotos,
    APIResponsePhotosNames,
    APIResponseStatistic, // IRelayList,
    // IRelaySet,
    IRestAuth, // IRestCatalogItem,
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
        deleteCatalog: builder.mutation<void, string>({
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

        getAuthMe: builder.mutation<void, void>({
            query: () => 'auth/me'
        }),
        getCatalogItem: builder.query<TCatalog, string>({
            providesTags: (result, error, id) => [{ id, type: 'Catalog' }],
            query: (object) => `catalog/${object}`
        }),
        getCatalogList: builder.query<APIResponseCatalogList, void>({
            providesTags: () => [{ id: 'LIST', type: 'Catalog' }],
            query: () => 'catalog'
        }),
        getCategoriesList: builder.query<APIRequestCategories, void>({
            keepUnusedDataFor: 3600,
            query: () => 'category'
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

        getPhotoItem: builder.query<TPhoto, string>({
            keepUnusedDataFor: 3600,
            query: (object) => `photo/${object}`
        }),
        getPhotoList: builder.query<APIResponsePhotos, Maybe<APIRequestPhotos>>(
            {
                keepUnusedDataFor: 3600,
                query: (params) => `photo${encodeQueryData(params)}`
            }
        ),

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
        getStatistic: builder.query<APIResponseStatistic, void>({
            providesTags: () => [{ type: 'Catalog' }],
            query: () => 'statistic'
        }),
        getStatisticCatalogItems: builder.query<APIResponseCatalogNames, void>({
            query: () => 'statistic/catalog'
        }),

        getStatisticPhotosItems: builder.query<APIResponsePhotosNames, void>({
            query: () => 'statistic/photos'
        }),

        patchCatalog: builder.mutation<
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

        // getWeatherCurrent: builder.query<IRestWeatherCurrent, null>({
        //     query: () => 'weather/current'
        // }),
        // getWeatherMonth: builder.mutation<IRestWeatherMonth, string>({
        //     query: (date) => `weather/month?date=${date}`
        // }),

        postAuthLogin: builder.mutation<APIResponseLogin, APIRequestLogin>({
            query: (credentials) => ({
                body: credentials,
                method: 'POST',
                url: 'auth/login'
            }),
            transformErrorResponse: (response) => response.data
            // transformResponse: (response: { data: APIResponseLogin }) =>
            //     response.data
        }),

        postCatalog: builder.mutation<
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
        })
        // logout: builder.mutation<IRestAuth, void>({
        //     query: () => 'auth/logout'
        // }),
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
    tagTypes: ['Catalog', 'Statistic']
})

// Export hooks for usage in functional components
export const {
    useGetStatisticQuery,
    useGetStatisticCatalogItemsQuery,
    useGetStatisticPhotosItemsQuery,
    useGetCatalogListQuery,
    useGetPhotoListQuery,
    useGetCategoriesListQuery,
    useGetCatalogItemQuery,
    useGetPhotoItemQuery,

    usePostAuthLoginMutation,
    useGetAuthMeMutation,

    usePatchCatalogMutation,
    usePostCatalogMutation,

    useDeleteCatalogMutation,
    util: { getRunningQueriesThunk }
} = api

// export endpoints for use in SSR
export const {
    getCatalogList,
    getCatalogItem,
    getPhotoList,
    getStatisticCatalogItems,
    getStatisticPhotosItems
} = api.endpoints
