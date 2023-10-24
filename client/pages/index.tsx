import {
    catalogGetList,
    getRunningQueriesThunk,
    photoGetList,
    useCatalogGetListQuery,
    usePhotoGetListQuery,
    useStatisticGetTelescopeQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React from 'react'

import Calendar from '@/components/calendar'
import PhotoGrid from '@/components/photo-grid'
import Statistic from '@/components/statistic'
import TelescopeWorkdays from '@/components/telescope-workdays'

export const getServerSideProps = wrapper.getServerSideProps(
    (store) => async () => {
        store.dispatch(catalogGetList.initiate())
        store.dispatch(photoGetList.initiate({ limit: 4, order: 'random' }))

        await Promise.all(store.dispatch(getRunningQueriesThunk()))

        return {
            props: { object: {} }
        }
    }
)

const HomePage: NextPage = () => {
    const { data: photoData, isLoading: photoLoading } = usePhotoGetListQuery({
        limit: 4,
        order: 'random'
    })
    const { data: catalogData, isLoading: catalogLoading } =
        useCatalogGetListQuery()

    const { data: telescopeData, isFetching: telescopeLoading } =
        useStatisticGetTelescopeQuery()

    return (
        <main>
            <NextSeo
                title={'Любительская астрономическая обсерватория'}
                description={
                    'Самодельная любительская астрономическая обсерватория с удаленным доступом из любой точки мира через интернет. Статистика работы обсерватории, количество отснятых кадров и накопленных данных. Календарь работы телескопа.'
                }
                openGraph={{
                    images: [
                        {
                            height: 819,
                            url: '/screenshots/main.jpg',
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />
            <Statistic />
            <PhotoGrid
                loading={photoLoading || catalogLoading}
                loaderCount={4}
                photos={photoData?.items}
                catalog={catalogData?.items}
            />
            <TelescopeWorkdays
                eventsTelescope={telescopeData?.items}
                loading={telescopeLoading}
            />
            <Calendar eventsTelescope={telescopeData?.items} />
        </main>
    )
}

export default HomePage
