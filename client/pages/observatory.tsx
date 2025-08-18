import React from 'react'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'

import { API, setLocale, SITE_LINK, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { AstronomyCalc, Calendar, Camera, RelayList, Weather } from '@/components/pages/observatory'

type ObservatoryPageProps = object

const ObservatoryPage: NextPage<ObservatoryPageProps> = () => {
    const { t, i18n } = useTranslation()

    const { data } = API.useStatisticGetTelescopeQuery()

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')

    return (
        <AppLayout>
            <NextSeo
                title={t('observatory')}
                description={t('description-observatory')}
                canonical={`${canonicalUrl}observatory`}
                openGraph={{
                    images: [
                        {
                            height: 854,
                            url: '/screenshots/observatory.jpg',
                            width: 1280
                        }
                    ],
                    siteName: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('observatory')}
                currentPage={t('observatory')}
            />

            <div>
                <p>
                    {t('observatory-page.intro')}{' '}
                    <Link
                        href={'/observatory/overview'}
                        title={t('observatory-orenburg')}
                    >
                        {t('observatory-orenburg')}
                    </Link>
                    {'.'}
                </p>
            </div>

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

            {/*eslint-disable-next-line @typescript-eslint/no-explicit-any*/}
            <Calendar eventsTelescope={data?.items as any[]} />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<ObservatoryPageProps>> => {
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
