import { APIMeteo, Weather as WeatherType } from '@/api/apiMeteo'
import { formatDateUTC, minutesAgo } from '@/functions/helpers'
import { useTranslation } from 'next-i18next'
import React from 'react'
import { Container, cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

const WEATHER_THRESHOLD = 25

const Weather: React.FC = () => {
    const { t } = useTranslation()
    const { data, isLoading } = APIMeteo.useGetCurrentQuery()

    const getRange = (
        value?: number,
        min: number = 0,
        max: number = 10
    ): string => {
        if (value === undefined) return ''
        const calcVal = value * (1 + WEATHER_THRESHOLD / 100)
        if (value === 0) return 'good'
        if (value > max || value < min) return 'danger'
        if (calcVal > max || calcVal < min) return 'warning'
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

    const weatherState = Object.values(weatherRanges).every(
        (range) => range === 'good'
    )
        ? 'good'
        : Object.values(weatherRanges).some((range) => range === 'danger')
        ? 'danger'
        : 'warning'

    const weatherCondition =
        weatherState === 'good'
            ? t('safely')
            : weatherState === 'danger'
            ? t('critical')
            : t('dangerous')

    return (
        <Container className={styles.weather}>
            <h4 className={styles.blockTitle}>
                {t('weather-conditions')}:{' '}
                <span className={cn(styles.weatherState, styles[weatherState])}>
                    {weatherCondition}
                </span>
            </h4>
            <div className={styles.update}>
                {t('updated')}:{' '}
                <strong>
                    {!isLoading ? formatDateUTC(data?.date) : t('loading')}
                </strong>
                {data?.date && `(${minutesAgo(data.date)})`}
            </div>
            <div className={styles.grid}>
                {Object.entries(weatherRanges).map(([key, range]) => (
                    <div
                        key={key}
                        className={styles.key}
                    >
                        <span
                            className={cn(
                                styles.weatherCondition,
                                styles[range]
                            )}
                        />
                        {t(key)}:{' '}
                        <span className={styles.val}>
                            {data?.[key as keyof WeatherType] ?? '?'}{' '}
                            {key === 'temperature'
                                ? '℃'
                                : key === 'precipitation'
                                ? 'мм'
                                : 'м\\с'}
                        </span>
                    </div>
                ))}
            </div>
        </Container>
    )
}

export default Weather
