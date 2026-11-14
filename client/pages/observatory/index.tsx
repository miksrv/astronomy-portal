import React, { useMemo } from 'react'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'
import { JsonLdScript } from 'next-seo'

import { API, APIMeteo, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import {
    Camera,
    ConditionsVerdict,
    ForecastCard,
    ObservatoryStatus,
    ObservingSessions,
    RelayList,
    SkyCard,
    TelescopeActivity,
    TelescopeWidget,
    WeatherCard
} from '@/components/pages/observatory'
import { useNow } from '@/hooks/useNow'
import { TELESCOPE_JOBS_ENABLED } from '@/utils/constants'
import { createPageUrl } from '@/utils/helpers'
import { removeSSRQueryCache } from '@/utils/ssrCache'
import { initSSRLocale } from '@/utils/ssrLocale'
import { TelescopeNight, toTelescopeNights } from '@/utils/telescopeActivity'
import { OBSERVATORY_LAT, OBSERVATORY_LON } from '@/utils/visibility'

import styles from './styles.module.sass'

/** The weather station reports every few minutes: poll at its pace, not faster */
const WEATHER_POLLING_MS = 60_000

/** Older weather than this means the link to the observatory is down */
const STALE_WEATHER_MINUTES = 30

/** The agent posts a snapshot every minute or so: ask at that pace */
const OBSERVATORY_POLLING_MS = 60_000

/** The recent events fetched at once: "Show more" reveals them without another request */
const EVENTS_LIMIT = 40

interface ObservatoryPageProps {
    nights: TelescopeNight[]
}

const ObservatoryPage: NextPage<ObservatoryPageProps> = ({ nights }) => {
    const { t, i18n } = useTranslation()

    const now = useNow(60_000)

    const {
        data: weather,
        isLoading: weatherLoading,
        isError: weatherError
    } = APIMeteo.useGetCurrentQuery(undefined, {
        pollingInterval: WEATHER_POLLING_MS,
        skipPollingIfUnfocused: true
    })
    const {
        data: observatory,
        isLoading: observatoryLoading,
        isError: observatoryError
    } = API.useObservatoryGetStatusQuery(undefined, {
        pollingInterval: OBSERVATORY_POLLING_MS,
        skipPollingIfUnfocused: true
    })
    const {
        data: observatoryEvents,
        isLoading: eventsLoading,
        isError: eventsError
    } = API.useObservatoryGetEventsQuery(EVENTS_LIMIT, {
        pollingInterval: OBSERVATORY_POLLING_MS,
        skipPollingIfUnfocused: true
    })
    const { data: forecastDaily, isLoading: dailyLoading, isError: dailyError } = APIMeteo.useGetForecastDailyQuery()
    const {
        data: forecastHourly,
        isLoading: hourlyLoading,
        isError: hourlyError
    } = APIMeteo.useGetForecastHourlyQuery()

    const title = t('pages.observatory.title', 'Обсерватория')
    const overviewLink = t('pages.observatory.how-it-works', 'Как она устроена')

    // Minutes since the weather station last reported: the observatory's "online" signal
    const minutesAgo = useMemo(() => {
        const updated = weather?.lastUpdated ?? (weather?.date ? `${weather.date.replace(' ', 'T')}Z` : undefined)

        return now && updated
            ? Math.max(0, Math.round((now.getTime() - new Date(updated).getTime()) / 60_000))
            : undefined
    }, [now, weather?.lastUpdated, weather?.date])

    const online = minutesAgo !== undefined && !weather?.isStale && minutesAgo < STALE_WEATHER_MINUTES

    const placeSchema = useMemo(
        () => ({
            '@context': 'https://schema.org',
            '@type': 'Place',
            '@id': createPageUrl(i18n.language, 'observatory'),
            name: t('pages.observatory.schema-name', 'Любительская обсерватория «Смотри на звёзды»'),
            url: createPageUrl(i18n.language, 'observatory'),
            geo: { '@type': 'GeoCoordinates', latitude: OBSERVATORY_LAT, longitude: OBSERVATORY_LON },
            address: {
                '@type': 'PostalAddress',
                addressLocality: t('pages.observatory.schema-locality', 'Оренбург'),
                addressCountry: 'RU'
            }
        }),
        [i18n.language, t]
    )

    return (
        <AppLayout
            canonical={'observatory'}
            title={title}
            description={t(
                'pages.observatory.description',
                'Самодельная любительская астрономическая обсерватория с удаленным доступом из любой точки мира через интернет. Статистика работы обсерватории, количество отснятых кадров и накопленных данных. Календарь работы телескопа.'
            )}
            openGraph={{
                images: [
                    {
                        height: 630,
                        url: '/images/og-observatory.jpg',
                        width: 1200
                    }
                ]
            }}
        >
            <JsonLdScript
                scriptKey={'observatory-place'}
                data={placeSchema}
            />

            <AppToolbar
                title={title}
                currentPage={title}
                lead={
                    <>
                        {t(
                            'pages.observatory.lead',
                            'Погода, камеры, оборудование и расписание съёмки в реальном времени. Обсерватория сама решает, начинать ли съёмку, анализируя условия.'
                        )}{' '}
                        <Link
                            href={'/observatory/overview'}
                            title={overviewLink}
                        >
                            {`${overviewLink} →`}
                        </Link>
                    </>
                }
            />

            <ConditionsVerdict
                weather={weather}
                now={now}
                online={online}
                loading={weatherLoading}
            />

            <div className={styles.bento}>
                <WeatherCard
                    weather={weather}
                    loading={weatherLoading}
                    error={weatherError}
                    online={online}
                    minutesAgo={minutesAgo}
                />
                <SkyCard now={now} />
                <ForecastCard
                    className={styles.wide}
                    daily={forecastDaily}
                    hourly={forecastHourly}
                    now={now}
                    loading={dailyLoading || hourlyLoading}
                    error={dailyError && hourlyError}
                />
            </div>

            {TELESCOPE_JOBS_ENABLED && <TelescopeWidget />}

            <h2 className={styles.sectionTitle}>{t('pages.observatory.state', 'Состояние оборудования')}</h2>
            <ObservatoryStatus
                status={observatory}
                loading={observatoryLoading}
                error={observatoryError}
                now={now}
                events={observatoryEvents?.items}
                eventsLoading={eventsLoading}
                eventsError={eventsError}
            />

            <div className={styles.cameras}>
                <Camera
                    cameraURL={`${process.env.NEXT_PUBLIC_API_HOST}camera/2`}
                    interval={6}
                    label={t('pages.observatory.camera-observatory', 'Обсерватория')}
                />
                <Camera
                    cameraURL={`${process.env.NEXT_PUBLIC_API_HOST}camera/1`}
                    interval={30}
                    label={t('pages.observatory.camera-sky', 'Всё небо')}
                />
            </div>

            <h2 className={styles.sectionTitle}>{t('pages.observatory.power-history', 'Питание и история съёмки')}</h2>
            <div className={styles.equipment}>
                <RelayList />
                <ObservingSessions nights={nights} />
            </div>

            <TelescopeActivity nights={nights} />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<ObservatoryPageProps>> => {
            const { translations } = await initSSRLocale(store, context, ['translation', 'observatory', 'starmap'])

            // The nights are rendered on the server: the objects shot are links worth indexing.
            // The weather and the forecast are fetched here too (the station answers in ~1 s):
            // they ship in the store, the client hooks pick them up and only poll for updates
            const [{ data: telescope }] = await Promise.all([
                store.dispatch(API.endpoints?.statisticGetTelescope.initiate()),
                store.dispatch(APIMeteo.endpoints.getCurrent.initiate()),
                store.dispatch(APIMeteo.endpoints.getForecastDaily.initiate()),
                store.dispatch(APIMeteo.endpoints.getForecastHourly.initiate())
            ])

            await Promise.all([
                ...store.dispatch(API.util.getRunningQueriesThunk()),
                ...store.dispatch(APIMeteo.util.getRunningQueriesThunk())
            ])

            removeSSRQueryCache(store, ['statisticGetTelescope'])

            // Public page: nginx caches the HTML for a short while (config/nginx.conf), so a burst
            // of visitors costs the API one request - unless the API gave nothing to show
            if (telescope) {
                context.res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=240')
            }

            return {
                props: {
                    ...translations,
                    nights: toTelescopeNights(telescope?.items)
                }
            }
        }
)

export default ObservatoryPage
