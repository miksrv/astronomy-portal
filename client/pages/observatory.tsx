import { API, ApiModel, ApiType } from '@/api'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React from 'react'

import AppLayout from '@/components/app-layout'
import Calendar from '@/components/calendar'
import PhotoGrid from '@/components/photo-grid'
import Statistic from '@/components/statistic'
import TelescopeWorkdays from '@/components/telescope-workdays'

interface HomePageProps {
    photos: ApiModel.Photo[]
    catalog: ApiModel.Catalog[]
    telescope: ApiModel.Statistic.Telescope[]
    statistic: ApiType.Statistic.ResGeneral | null
}

const HomePage: NextPage<HomePageProps> = ({
    photos,
    catalog,
    telescope,
    statistic
}) => (
    <AppLayout>
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

        {statistic && <Statistic {...statistic} />}

        <PhotoGrid
            photos={photos}
            catalog={catalog}
        />

        <TelescopeWorkdays eventsTelescope={telescope} />

        <Calendar eventsTelescope={telescope} />
    </AppLayout>
)

export const getServerSideProps = wrapper.getServerSideProps(
    (store) => async (): Promise<GetServerSidePropsResult<HomePageProps>> => {
        const { data: catalog } = await store.dispatch(
            API.endpoints?.catalogGetList.initiate()
        )

        const { data: telescope } = await store.dispatch(
            API.endpoints?.statisticGetTelescope.initiate()
        )

        const { data: photos } = await store.dispatch(
            API.endpoints?.photoGetList.initiate({ limit: 4, order: 'random' })
        )

        const { data: statistic } = await store.dispatch(
            API.endpoints?.statisticGet.initiate()
        )

        await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

        return {
            props: {
                catalog: catalog?.items || [],
                photos: photos?.items || [],
                statistic: statistic || null,
                telescope: telescope?.items || []
            }
        }
    }
)

export default HomePage
