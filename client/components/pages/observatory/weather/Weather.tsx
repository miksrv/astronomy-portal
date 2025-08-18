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

    const weatherState = Object.values(weatherRanges).every((range) => range === 'good')
        ? 'good'
        : Object.values(weatherRanges).some((range) => range === 'danger')
          ? 'danger'
          : 'warning'

    const weatherCondition =
        weatherState === 'good' ? t('safely') : weatherState === 'danger' ? t('critical') : t('dangerous')

    return (
        <Container className={styles.weather}>
            <div className={styles.toolbar}>
                <h4 className={styles.title}>
                    {t('weather-conditions')}:{' '}
                    <span className={cn(styles.weatherState, styles[weatherState])}>{weatherCondition}</span>
                </h4>
                <Link
                    href={'/observatory/weather'}
                    title={t('observatory-orenburg-weather')}
                >
                    {t('read-more')}
                </Link>
            </div>
            <div className={styles.update}>
                {t('updated')}: <strong>{!isLoading ? formatUTCDate(data?.date) : t('loading')}</strong>
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
                                  ? 'мм'
                                  : key === 'humidity'
                                    ? '%'
                                    : 'м\\с'}
                        </span>
                    </div>
                ))}
            </div>
        </Container>
    )
}
