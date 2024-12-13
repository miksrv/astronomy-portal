import { API, ApiModel, ApiType } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import React from 'react'

import AppLayout from '@/components/app-layout'
import Calendar from '@/components/calendar'
import PhotoGrid from '@/components/photo-grid'
import Statistic from '@/components/statistic'
import TelescopeWorkdays from '@/components/telescope-workdays'

interface ObservatoryPageProps {
    // photos: ApiModel.Photo[]
    // catalog: ApiModel.Catalog[]
    // telescope: ApiModel.Statistic.Telescope[]
    // statistic: ApiType.Statistic.ResGeneral | null
}

const ObservatoryPage: NextPage<ObservatoryPageProps> = (
    {
        // photos,
        // catalog,
        // telescope,
        // statistic
    }
) => (
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

        <Calendar />

        {/*{statistic && <Statistic {...statistic} />}*/}

        {/*<PhotoGrid*/}
        {/*    photos={photos}*/}
        {/*    catalog={catalog}*/}
        {/*/>*/}

        {/*<TelescopeWorkdays eventsTelescope={telescope} />*/}

        {/*<Calendar eventsTelescope={telescope} />*/}
    </AppLayout>
)

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<ObservatoryPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            // const { data: catalog } = await store.dispatch(
            //     API.endpoints?.catalogGetList.initiate()
            // )
            //
            // const { data: telescope } = await store.dispatch(
            //     API.endpoints?.statisticGetTelescope.initiate()
            // )
            //
            // const { data: photos } = await store.dispatch(
            //     API.endpoints?.photoGetList.initiate({
            //         limit: 4,
            //         order: 'random'
            //     })
            // )
            //
            // const { data: statistic } = await store.dispatch(
            //     API.endpoints?.statisticGet.initiate()
            // )

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations
                    // catalog: catalog?.items || [],
                    // photos: photos?.items || [],
                    // statistic: statistic || null,
                    // telescope: telescope?.items || []
                }
            }
        }
)

export default ObservatoryPage
