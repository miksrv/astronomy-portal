import { API } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { formatObjectName } from '@/tools/strings'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import React, { useMemo, useState } from 'react'
import { Container } from 'simple-react-ui-kit'

import AppLayout from '@/components/app-layout'
import StarMap from '@/components/star-map'
import { StarMapObject } from '@/components/star-map/StarMap'

type CelestialPageProps = {}

const CelestialPage: NextPage<CelestialPageProps> = () => {
    const { t } = useTranslation()

    const [goToObject, setGoToObject] = useState<[number, number]>([0, 0])

    const { data } = API.useObjectsGetListQuery()

    const starMapObjects: StarMapObject[] = useMemo(
        () =>
            data?.items
                ?.filter(
                    (item) => item.ra !== undefined && item.dec !== undefined
                )
                ?.map((item) => ({
                    ra: item.ra as number,
                    dec: item.dec as number,
                    name: formatObjectName(item.name)
                })) || [],
        [data]
    )

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
                    objects={starMapObjects}
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
