import { API } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import React from 'react'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import AstronomyCalc from '@/components/astronomy-calc'
import Calendar from '@/components/calendar'
import Camera from '@/components/camera'
import RelayList from '@/components/relay-list'
import Weather from '@/components/weather'

interface ObservatoryPageProps {}

const ObservatoryPage: NextPage<ObservatoryPageProps> = () => {
    const { t, i18n } = useTranslation()

    const { data } = API.useStatisticGetTelescopeQuery()

    return (
        <AppLayout>
            <NextSeo
                title={t('observatory')}
                description={t('description-observatory')}
                openGraph={{
                    images: [
                        {
                            height: 854,
                            url: '/screenshots/observatory.jpg',
                            width: 1280
                        }
                    ],
                    siteName: t('look-at-the-stars'),
                    title: t('astrophoto'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('observatory')}
                currentPage={t('observatory')}
            />

            <div className={'observatoryGrid'}>
                <div>
                    <Weather />
                    <AstronomyCalc />
                </div>
                <div>
                    <RelayList />
                </div>
            </div>

            <div className={'observatoryGrid'}>
                <Camera
                    cameraURL={`${process.env.NEXT_PUBLIC_API_HOST}/camera/2`}
                    interval={4}
                />

                <Camera
                    cameraURL={`${process.env.NEXT_PUBLIC_API_HOST}/camera/1`}
                    interval={30}
                />
            </div>

            <Calendar eventsTelescope={data?.items} />

            <AppFooter />
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
