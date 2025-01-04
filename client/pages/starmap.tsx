import { API } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import React, { useState } from 'react'
import { Container } from 'simple-react-ui-kit'

import AppLayout from '@/components/app-layout'
import StarMap from '@/components/star-map'

type CelestialPageProps = {}

// TODO: При добавить URL параметр названия объекта для центрирования карты на нем
const CelestialPage: NextPage<CelestialPageProps> = () => {
    const { t } = useTranslation()

    const [goToObject, setGoToObject] = useState<[number, number]>([0, 0])

    const { data } = API.useObjectsGetListQuery()

    return (
        <AppLayout>
            <NextSeo
                title={'Карта звездного неба'}
                description={
                    'Карта звездного неба с галактиками, туманностями, кометами, сверхновыми и другими космическими объектами, снятых любительским телескопом'
                }
                openGraph={{
                    images: [
                        {
                            height: 815,
                            url: '/screenshots/celestial.jpg',
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />

            <div className={'toolbarHeader'}>
                <h1 className={'pageTitle'}>{t('star-map')}</h1>
            </div>

            <Container>
                <StarMap
                    objects={data?.items}
                    // interactive={true}
                    // goto={goToObject}
                />
            </Container>
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<CelestialPageProps>> => {
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
