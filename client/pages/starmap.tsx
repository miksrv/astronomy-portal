import React from 'react'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { Container } from 'simple-react-ui-kit'

import { API, SITE_LINK } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import StarMap from '@/components/star-map'

type CelestialPageProps = object

// TODO: При добавить URL параметр названия объекта для центрирования карты на нем
const CelestialPage: NextPage<CelestialPageProps> = () => {
    const { t, i18n } = useTranslation()

    const { data } = API.useObjectsGetListQuery()

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')

    return (
        <AppLayout>
            <NextSeo
                title={t('star-map')}
                description={t('description-star-map')}
                canonical={`${canonicalUrl}starmap`}
                openGraph={{
                    images: [
                        {
                            height: 815,
                            url: '/screenshots/starmap.jpg',
                            width: 1280
                        }
                    ],
                    siteName: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('star-map')}
                currentPage={t('star-map')}
            />

            <p>{t('starmap-page.description-1')}</p>
            <p>{t('starmap-page.description-2')}</p>

            <Container style={{ padding: '5px' }}>
                <StarMap objects={data?.items} />
            </Container>

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<CelestialPageProps>> => {
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

export default CelestialPage
