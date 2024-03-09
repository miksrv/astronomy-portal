import { api } from '@/api/api'
import { wrapper } from '@/api/store'
import {
    APIResponseStatistic,
    TCatalog,
    TPhoto,
    TStatisticTelescope
} from '@/api/types'
import { GetServerSidePropsResult, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React from 'react'

import Calendar from '@/components/calendar'
import PhotoGrid from '@/components/photo-grid'
import Statistic from '@/components/statistic'
import TelescopeWorkdays from '@/components/telescope-workdays'

interface HomePageProps {
    photos: TPhoto[]
    catalog: TCatalog[]
    telescope: TStatisticTelescope[]
    statistic: APIResponseStatistic | null
}

const HomePage: NextPage<HomePageProps> = ({
    photos,
    catalog,
    telescope,
    statistic
}) => (
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

        {statistic && <Statistic {...statistic} />}

        <PhotoGrid
            photos={photos}
            catalog={catalog}
        />

        <TelescopeWorkdays eventsTelescope={telescope} />

        <Calendar eventsTelescope={telescope} />
    </main>
)

export const getServerSideProps = wrapper.getServerSideProps(
    (store) => async (): Promise<GetServerSidePropsResult<HomePageProps>> => {
        const { data: catalog } = await store.dispatch(
            api.endpoints?.catalogGetList.initiate()
        )

        const { data: telescope } = await store.dispatch(
            api.endpoints?.statisticGetTelescope.initiate()
        )

        const { data: photos } = await store.dispatch(
            api.endpoints?.photoGetList.initiate({ limit: 4, order: 'random' })
        )

        const { data: statistic } = await store.dispatch(
            api.endpoints?.statisticGet.initiate()
        )

        await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()))

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
