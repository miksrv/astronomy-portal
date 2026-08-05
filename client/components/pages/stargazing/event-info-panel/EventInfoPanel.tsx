import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import { TFunction } from 'i18next'
import { Icon, IconTypes } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { APIMeteo, ApiModel } from '@/api'
import { EventMap } from '@/components/common/event-map'
import { formatUTCDate } from '@/utils/dates'

import styles from './styles.module.sass'

const WEATHER_HISTORY_LINK = 'https://meteo.miksoft.pro/history'
const WEATHER_FORECAST_LINK = 'https://meteo.miksoft.pro/forecast'
const WEATHER_AVERAGE_WINDOW_HOURS = 3

interface EventInfoPanelProps {
    event?: ApiModel.Event
}

interface InfoRow {
    icon: IconTypes
    label: string
    value: React.ReactNode
}

const averageOf = (items: ApiModel.Weather[], key: keyof ApiModel.Weather): number | undefined => {
    const values = items.map((item) => item[key]).filter((value): value is number => typeof value === 'number')

    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined
}

const formatTemperature = (value?: number): string | undefined => {
    if (value === undefined) {
        return undefined
    }

    const rounded = Math.round(value)

    return `${rounded > 0 ? '+' : ''}${rounded}°C`
}

const getCloudsDescription = (clouds: number, t: TFunction): string => {
    if (clouds <= 20) {
        return t('pages.stargazing.event-weather-clear', 'Ясно')
    }

    if (clouds <= 50) {
        return t('pages.stargazing.event-weather-slightly-cloudy', 'Малооблачно')
    }

    if (clouds <= 80) {
        return t('pages.stargazing.event-weather-partly-cloudy', 'Облачно с прояснениями')
    }

    return t('pages.stargazing.event-weather-cloudy', 'Облачно')
}

export const EventInfoPanel: React.FC<EventInfoPanelProps> = ({ event }) => {
    const { t } = useTranslation()

    const eventDate = event?.date?.date
    const isEventPast = !!eventDate && dayjs.utc(eventDate).isBefore(dayjs.utc())

    const { data: weatherHistory, isFetching: isHistoryLoading } = APIMeteo.useGetHistoryQuery(
        {
            start_date: dayjs(eventDate).format('YYYY-MM-DD'),
            end_date: dayjs(eventDate).format('YYYY-MM-DD')
        },
        { skip: !eventDate || !isEventPast }
    )

    const { data: weatherForecast, isFetching: isForecastLoading } = APIMeteo.useGetForecastDailyQuery(undefined, {
        skip: !eventDate || isEventPast
    })

    const isWeatherLoading = isEventPast ? isHistoryLoading : isForecastLoading

    const averageWeather = useMemo(() => {
        if (!eventDate) {
            return undefined
        }

        if (isEventPast) {
            if (!weatherHistory?.length) {
                return undefined
            }

            const windowStart = dayjs(eventDate)
            const windowEnd = windowStart.add(WEATHER_AVERAGE_WINDOW_HOURS, 'hour')

            const relevant = weatherHistory.filter(
                (item) => item.date && !dayjs(item.date).isBefore(windowStart) && !dayjs(item.date).isAfter(windowEnd)
            )

            if (!relevant.length) {
                return undefined
            }

            return {
                temperature: averageOf(relevant, 'temperature'),
                clouds: averageOf(relevant, 'clouds')
            }
        }

        const forecastDay = weatherForecast?.find((item) => item.date && dayjs(item.date).isSame(eventDate, 'day'))

        if (!forecastDay) {
            return undefined
        }

        return {
            temperature: forecastDay.temperature,
            clouds: forecastDay.clouds
        }
    }, [eventDate, isEventPast, weatherHistory, weatherForecast])

    const weatherLink = useMemo(() => {
        if (!isEventPast) {
            return WEATHER_FORECAST_LINK
        }

        if (!eventDate) {
            return WEATHER_HISTORY_LINK
        }

        const startDate = dayjs(eventDate).format('YYYY-MM-DD')
        const endDate = dayjs(eventDate).add(1, 'day').format('YYYY-MM-DD')

        return `${WEATHER_HISTORY_LINK}?end_date=${endDate}&start_date=${startDate}`
    }, [eventDate, isEventPast])

    const weatherText = useMemo(() => {
        if (isWeatherLoading) {
            return t('pages.stargazing.event-weather-loading', 'Загрузка...')
        }

        if (!averageWeather || averageWeather.clouds === undefined) {
            return t('pages.stargazing.event-weather-unavailable', 'Пока нет данных')
        }

        const temperature = formatTemperature(averageWeather.temperature)

        return [getCloudsDescription(averageWeather.clouds, t), temperature].filter(Boolean).join(', ')
    }, [averageWeather, isWeatherLoading, t])

    const membersCount = event?.members?.total || event?.availableTickets

    const formattedDate = formatUTCDate(eventDate, 'dddd, D MMMM YYYY')
    const capitalizedDate = formattedDate
        ? `${formattedDate.charAt(0).toUpperCase()}${formattedDate.slice(1)}`
        : formattedDate

    // `latitude`/`longitude`/`address` are stripped server-side until the
    // viewer has a booking for an upcoming event that requires registration
    // — see Events::show()/upcoming() on the backend. `location` is public.
    const preciseLocation =
        event?.latitude !== undefined && event?.longitude !== undefined
            ? { latitude: event.latitude, longitude: event.longitude }
            : undefined
    const isLocationPending = !preciseLocation && !!event?.requiresRegistration && !event?.registered

    const locationValue = isLocationPending ? (
        t('pages.stargazing.event-location-hidden', 'Будет доступно после регистрации')
    ) : (
        <>
            {event?.location || t('pages.stargazing.event-location-fallback', 'Загородная обсерватория')}
            {event?.address && <span className={styles.addressText}>{event.address}</span>}
        </>
    )

    const ageValue = event?.minAge
        ? t('pages.stargazing.event-age-value', 'Для людей старше {{age}}+', { age: event.minAge })
        : t('pages.stargazing.event-age-any', 'Для всех возрастов')

    const rows: InfoRow[] = [
        {
            icon: 'Calendar',
            label: t('pages.stargazing.event-date-label', 'Дата (GMT+5)'),
            value: capitalizedDate
        },
        {
            icon: 'Time',
            label: t('pages.stargazing.event-time-label', 'Время (GMT+5)'),
            value: event?.endDate?.date
                ? `${formatUTCDate(eventDate, 'HH:mm')} — ${formatUTCDate(event.endDate.date, 'HH:mm')}`
                : formatUTCDate(eventDate, 'HH:mm')
        },
        ...(isEventPast
            ? [
                  {
                      icon: 'Users' as IconTypes,
                      label: t('pages.stargazing.members-label', 'Участники'),
                      value:
                          membersCount !== undefined
                              ? t('pages.stargazing.members-count', '{{count}} человек', { count: membersCount })
                              : '—'
                  }
              ]
            : []),
        {
            icon: 'Tag',
            label: t('pages.stargazing.event-age-label', 'Возраст'),
            value: ageValue
        },
        {
            icon: 'PinDrop',
            label: t('pages.stargazing.event-location-label', 'Место'),
            value: locationValue
        }
    ]

    return (
        <div className={styles.infoContainer}>
            <ul className={styles.list}>
                {rows.map((row) => (
                    <li
                        key={row.label}
                        className={styles.row}
                    >
                        <span className={styles.rowLabel}>
                            <Icon
                                name={row.icon}
                                aria-hidden
                            />
                            {row.label}
                        </span>
                        <span className={styles.rowValue}>{row.value}</span>
                    </li>
                ))}

                <li className={styles.row}>
                    <span className={styles.rowLabel}>
                        <Icon
                            name={'Cloud'}
                            aria-hidden
                        />
                        {t('pages.stargazing.event-weather-label', 'Погода')}
                    </span>
                    <span className={styles.rowValue}>
                        {weatherText}
                        <Link
                            className={styles.weatherLink}
                            href={weatherLink}
                            target={'_blank'}
                            rel={'noopener noreferrer'}
                        >
                            {isEventPast
                                ? t('pages.stargazing.event-weather-history-link', 'Смотреть погоду')
                                : t('pages.stargazing.event-weather-forecast-link', 'Смотреть прогноз')}
                        </Link>
                    </span>
                </li>
            </ul>

            {preciseLocation && (
                <EventMap
                    latitude={preciseLocation.latitude}
                    longitude={preciseLocation.longitude}
                    height={140}
                />
            )}
        </div>
    )
}
