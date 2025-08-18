import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import { Container } from 'simple-react-ui-kit'

import type { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'

import { APIMeteo, setLocale, wrapper } from '@/api'
import { AppLayout, AppToolbar } from '@/components/common'
import { WidgetChart } from '@/components/pages/observatory'
import { getDateTimeFormat } from '@/utils/dates'

type HistoryPageProps = object

const HistoryPage: NextPage<HistoryPageProps> = () => {
    const { i18n, t } = useTranslation()

    const startDate = dayjs().startOf('days').format('YYYY-MM-DD')
    const endDate = dayjs().startOf('days').add(1, 'day').format('YYYY-MM-DD')

    const { data: history, isLoading: historyLoading } = APIMeteo.useGetHistoryQuery({
        start_date: startDate,
        end_date: endDate
    })

    const dateFormat = useMemo(
        () => getDateTimeFormat(startDate, endDate, i18n.language === 'en'),
        [startDate, endDate, i18n.language]
    )

    return (
        <AppLayout>
            <NextSeo
                title={t('observatory-orenburg-weather')}
                description={t('description-observatory-weather')}
                canonical={`${process.env.NEXT_PUBLIC_SITE_LINK}/observatory/weather`}
                openGraph={{
                    siteName: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('observatory-orenburg-weather')}
                currentPage={t('observatory-orenburg-weather')}
                links={[
                    {
                        link: '/observatory',
                        text: t('observatory')
                    }
                ]}
            />

            <p>
                {t('observatory-weather-page.intro')}{' '}
                <Link
                    href={'https://meteo.miksoft.pro/'}
                    target={'_blank'}
                    title={t('observatory-orenburg-weather')}
                >
                    {'meteo.miksoft.pro'}
                </Link>
                {'.'}
            </p>

            <Container style={{ marginBottom: '10px' }}>
                <WidgetChart
                    fullWidth={true}
                    type={'temperature'}
                    data={history}
                    loading={historyLoading}
                    dateFormat={dateFormat}
                />
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <WidgetChart
                    fullWidth={true}
                    type={'clouds'}
                    data={history}
                    loading={historyLoading}
                    dateFormat={dateFormat}
                />
            </Container>
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<HistoryPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default HistoryPage
