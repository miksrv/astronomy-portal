import React from 'react'
import { cn, Container } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { APIMeteo, ApiModel } from '@/api'
import { formatUTCDate } from '@/utils/dates'
import { minutesAgo } from '@/utils/helpers'

import styles from './styles.module.sass'

const WEATHER_THRESHOLD = 25

type WeatherKey = 'temperature' | 'humidity' | 'clouds' | 'windSpeed' | 'precipitation' | 'windGust'

type WeatherParam = {
    key: WeatherKey
    range: string
}

export const Weather: React.FC = () => {
    const { t } = useTranslation()
    const { data, isLoading } = APIMeteo.useGetCurrentQuery()

    const getRange = (value?: number, min: number = 0, max: number = 10): string => {
        if (value === undefined) {
            return ''
        }
        const calcVal = value * (1 + WEATHER_THRESHOLD / 100)
        if (value === 0) {
            return 'good'
        }
        if (value > max || value < min) {
            return 'danger'
        }
        if (calcVal > max || calcVal < min) {
            return 'warning'
        }
        return 'good'
    }

    const weatherLabels: Record<WeatherKey, string> = {
        temperature: t('components.pages.observatory.weather.label-temperature', 'Температура'),
        humidity: t('components.pages.observatory.weather.label-humidity', 'Влажность'),
        clouds: t('components.pages.observatory.weather.label-clouds', 'Облачность'),
        windSpeed: t('components.pages.observatory.weather.label-wind-speed', 'Скорость ветра'),
        precipitation: t('components.pages.observatory.weather.label-precipitation', 'Осадки'),
        windGust: t('components.pages.observatory.weather.label-wind-gust', 'Порывы ветра')
    }

    const weatherUnits: Record<WeatherKey, string> = {
        temperature: '℃',
        humidity: '%',
        clouds: '%',
        windSpeed: t('components.pages.observatory.weather.unit-wind', 'м\\с'),
        precipitation: t('components.pages.observatory.weather.unit-precipitation', 'мм'),
        windGust: t('components.pages.observatory.weather.unit-wind', 'м\\с')
    }

    const weatherParams: WeatherParam[] = [
        { key: 'temperature', range: getRange(data?.temperature, -24, 24) },
        { key: 'humidity', range: getRange(data?.humidity, 0, 90) },
        { key: 'clouds', range: getRange(data?.clouds, 0, 50) },
        { key: 'windSpeed', range: getRange(data?.windSpeed, 0, 10) },
        { key: 'precipitation', range: getRange(data?.precipitation, 0.1, 0.1) },
        { key: 'windGust', range: getRange(data?.windGust, 0, 8) }
    ]

    const weatherState = React.useMemo(() => {
        const ranges = weatherParams.map((param) => param.range)
        if (ranges.every((range) => range === 'good')) {
            return 'good'
        }
        if (ranges.some((range) => range === 'danger')) {
            return 'danger'
        }
        return 'warning'
    }, [weatherParams])

    const weatherCondition = React.useMemo(() => {
        if (weatherState === 'good') {
            return t('components.pages.observatory.weather.safely', 'Безопасно')
        }
        if (weatherState === 'danger') {
            return t('components.pages.observatory.weather.critical', 'Критическое')
        }
        return t('components.pages.observatory.weather.dangerous', 'Опасное')
    }, [weatherState, t])

    return (
        <Container className={styles.weather}>
            <div className={styles.toolbar}>
                <h4 className={styles.title}>
                    {t('components.pages.observatory.weather.weather-conditions', 'Состояние погоды')}:{' '}
                    <span className={cn(styles.weatherState, styles[weatherState])}>{weatherCondition}</span>
                </h4>
                <Link
                    href={'/observatory/weather'}
                    title={t(
                        'components.pages.observatory.weather.observatory-in-orenburg-weather',
                        'Погода в Обсерватории Оренбурга'
                    )}
                >
                    {t('components.pages.observatory.weather.read-more', 'Подробнее')}
                </Link>
            </div>
            <div className={styles.update}>
                {t('components.pages.observatory.weather.updated', 'Обновлено')}:{' '}
                <strong>
                    {!isLoading
                        ? formatUTCDate(data?.date)
                        : t('components.pages.observatory.weather.loading', 'Погода загружается...')}
                </strong>
                {data?.date && `(${minutesAgo(data.date)})`}
            </div>
            <div className={styles.grid}>
                {weatherParams.map(({ key, range }) => (
                    <div
                        key={key}
                        className={styles.key}
                    >
                        <span className={cn(styles.weatherCondition, styles[range])} />
                        {weatherLabels[key]}:{' '}
                        <span className={styles.val}>
                            {data?.[key as keyof ApiModel.Weather] ?? '?'} {weatherUnits[key]}
                        </span>
                    </div>
                ))}
            </div>
        </Container>
    )
}
