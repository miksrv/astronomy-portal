import React from 'react'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, setLocale, wrapper } from '@/api'
import { AppLayout, StarMap } from '@/components/common'

// TODO: При добавить URL параметр названия объекта для центрирования карты на нем
const CelestialPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const { data } = API.useObjectsGetListQuery()

    const title = t('pages.star-map.title', 'Карта звёздного неба')

    return (
        <AppLayout
            fullWidth={true}
            canonical={'starmap'}
            title={title}
            description={t(
                'pages.star-map.description',
                'Карта звездного неба с галактиками, туманностями, кометами, сверхновыми и другими космическими объектами, снятых любительским телескопом'
            )}
            openGraph={{
                images: [
                    {
                        height: 815,
                        url: '/screenshots/starmap.jpg',
                        width: 1280
                    }
                ]
            }}
        >
            <div style={{ height: 'calc(100vh - 50px)', overflow: 'hidden' }}>
                <StarMap objects={data?.items} />
            </div>
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
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
