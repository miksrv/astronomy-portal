import { API } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import React from 'react'

import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import AstronomyCalc from '@/components/astronomy-calc'
import Calendar from '@/components/calendar'
import Camera from '@/components/camera'
import RelayList from '@/components/relay-list'
import TelescopeWorkdays from '@/components/telescope-workdays'
import Weather from '@/components/weather'

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
) => {
    const { t, i18n } = useTranslation()

    const { data } = API.useStatisticGetTelescopeQuery()

    return (
        <AppLayout>
            <NextSeo
                title={t('observatory')}
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
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('observatory')}
                currentPage={t('observatory')}
            />

            <Weather />
            <AstronomyCalc />

            <RelayList />

            <Camera
                cameraURL={`${process.env.NEXT_PUBLIC_API_HOST}/camera/2`}
                interval={5}
            />

            <Camera
                cameraURL={`${process.env.NEXT_PUBLIC_API_HOST}/camera/1`}
                interval={30}
            />

            <Calendar eventsTelescope={data?.items} />

            <TelescopeWorkdays eventsTelescope={data?.items} />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<ObservatoryPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default ObservatoryPage
