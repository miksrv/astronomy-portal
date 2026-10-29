import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import { Container } from 'simple-react-ui-kit'

import type { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { APIMeteo, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { WidgetChart } from '@/components/pages/observatory'
import { getDateTimeFormat } from '@/utils/dates'
import { initSSRLocale } from '@/utils/ssrLocale'

import styles from './styles.module.sass'

const HistoryPage: NextPage<object> = () => {
    const { i18n, t } = useTranslation()

    const startDate = dayjs().startOf('days').format('YYYY-MM-DD')
    const endDate = dayjs().startOf('days').add(1, 'day').format('YYYY-MM-DD')
    const title = t('pages.observatory-weather.title', 'Погода в Обсерватории Оренбурга')

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
            description={t(
                'pages.observatory-weather.description',
                'Актуальные графики погоды с метеостанции любительской обсерватории в пригороде Оренбурга. Температура, влажность, облачность и скорость ветра в реальном времени.'
            )}
            openGraph={{
                images: [{ url: '/images/obs-background.png', width: 1717, height: 916 }]
            }}
        >
            <AppToolbar
                title={title}
                currentPage={title}
                links={[
                    {
                        link: '/observatory',
                        text: t('menu.observatory', 'Обсерватория')
                    }
                ]}
            />

            <p className={styles.text}>
                {t(
                    'pages.observatory-weather.text',
                    'Следите за погодными условиями в режиме реального времени с метеостанции, установленной на самодельной астрономической обсерватории в пригороде Оренбурга. Графики отображают температуру, влажность, облачность и скорость ветра. Для полного доступа к данным и истории наблюдений переходите на сайт метеостанции:'
                )}{' '}
                <Link
                    href={'https://meteo.miksoft.pro/'}
                    target={'_blank'}
                    title={title}
                >
                    {'meteo.miksoft.pro'}
                </Link>
                {'.'}
            </p>

            <Container
                className={styles.chart}
                title={t('components.pages.observatory.widget-chart.temperature', 'Температура')}
            >
                <WidgetChart
                    fullWidth={true}
                    type={'temperature'}
                    data={history}
                    loading={historyLoading}
                    dateFormat={dateFormat}
                />
            </Container>

            <Container
                className={styles.chart}
                title={`${t('components.pages.observatory.widget-chart.clouds', 'Облачность')} / ${t('components.pages.observatory.widget-chart.wind-speed', 'Скорость ветра')}`}
            >
                <WidgetChart
                    fullWidth={true}
                    type={'clouds'}
                    data={history}
                    loading={historyLoading}
                    dateFormat={dateFormat}
                />
            </Container>

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const { translations } = await initSSRLocale(store, context)

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default HistoryPage
