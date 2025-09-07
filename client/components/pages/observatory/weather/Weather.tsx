import React from 'react'
import { cn, Container } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { APIMeteo, ApiModel } from '@/api'
import { formatUTCDate } from '@/utils/dates'
import { minutesAgo } from '@/utils/helpers'

import styles from './styles.module.sass'

const WEATHER_THRESHOLD = 25

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

    const weatherRanges = {
        temperature: getRange(data?.temperature, -24, 24),
        humidity: getRange(data?.humidity, 0, 90),
        clouds: getRange(data?.clouds, 0, 50),
        windSpeed: getRange(data?.windSpeed, 0, 10),
        precipitation: getRange(data?.precipitation, 0.1, 0.1),
        windGust: getRange(data?.windGust, 0, 8)
    }

    const weatherState = React.useMemo(() => {
        if (Object.values(weatherRanges).every((range) => range === 'good')) {
            return 'good'
        }
        if (Object.values(weatherRanges).some((range) => range === 'danger')) {
            return 'danger'
        }
        return 'warning'
    }, [weatherRanges])

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
                {Object.entries(weatherRanges).map(([key, range]) => (
                    <div
                        key={key}
                        className={styles.key}
                    >
                        <span className={cn(styles.weatherCondition, styles[range])} />
                        {t(key)}:{' '}
                        <span className={styles.val}>
                            {data?.[key as keyof ApiModel.Weather] ?? '?'}{' '}
                            {key === 'temperature'
                                ? '℃'
                                : key === 'precipitation'
                                  ? t('components.pages.observatory.weather.unit-precipitation', 'мм')
                                  : key === 'humidity'
                                    ? '%'
                                    : t('components.pages.observatory.weather.unit-wind', 'м\\с')}
                        </span>
                    </div>
                ))}
            </div>
        </Container>
    )
}
