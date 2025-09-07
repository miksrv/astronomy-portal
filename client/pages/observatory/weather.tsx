import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import { Container } from 'simple-react-ui-kit'

import type { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { APIMeteo, setLocale, wrapper } from '@/api'
import { AppLayout, AppToolbar } from '@/components/common'
import { WidgetChart } from '@/components/pages/observatory'
import { getDateTimeFormat } from '@/utils/dates'

const HistoryPage: NextPage<object> = () => {
    const { i18n, t } = useTranslation()

    const startDate = dayjs().startOf('days').format('YYYY-MM-DD')
    const endDate = dayjs().startOf('days').add(1, 'day').format('YYYY-MM-DD')
    const title = t('pages.observatory-weather.title', { defaultValue: 'Погода в Обсерватории Оренбурга' })

    const { data: history, isLoading: historyLoading } = APIMeteo.useGetHistoryQuery({
        start_date: startDate,
        end_date: endDate
    })

    const dateFormat = useMemo(
        () => getDateTimeFormat(startDate, endDate, i18n.language === 'en'),
        [startDate, endDate, i18n.language]
    )

    return (
        <AppLayout
            canonical={'observatory/weather'}
            title={title}
            description={t('pages.observatory-weather.description', {
                defaultValue:
                    'Актуальные графики погоды с метеостанции любительской обсерватории в пригороде Оренбурга. Температура, влажность, облачность и скорость ветра в реальном времени.'
            })}
        >
            <AppToolbar
                title={title}
                currentPage={title}
                links={[
                    {
                        link: '/observatory',
                        text: t('menu.observatory', { defaultValue: 'Обсерватория' })
                    }
                ]}
            />

            <p>
                {t('pages.observatory-weather.description', {
                    defaultValue:
                        'Следите за погодными условиями в режиме реального времени с метеостанции, установленной на самодельной астрономической обсерватории в пригороде Оренбурга. Графики отображают температуру, влажность, облачность и скорость ветра. Для полного доступа к данным и истории наблюдений переходите на сайт метеостанции:'
                })}{' '}
                <Link
                    href={'https://meteo.miksoft.pro/'}
                    target={'_blank'}
                    title={title}
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
        async (context): Promise<GetServerSidePropsResult<object>> => {
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
