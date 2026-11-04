import React from 'react'
import { cn, Container, Message, Skeleton } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { CardTitle, StatusBadge, StatusTone } from '@/components/ui'
import {
    getWeatherMeter,
    getWeatherRange,
    getWeatherState,
    WEATHER_KEYS,
    WeatherKey,
    WeatherRange
} from '@/utils/weather'

import { LiveMeta } from '../live-meta'

import styles from './styles.module.sass'

/** The overall weather on the shared status badge: the same look as the equipment states */
const RANGE_TONES: Record<WeatherRange, StatusTone> = {
    good: 'positive',
    warning: 'warning',
    danger: 'danger'
}

interface WeatherCardProps {
    weather?: ApiModel.Weather
    loading?: boolean
    /** The weather request failed and there is nothing to show */
    error?: boolean
    /** The station reported recently enough to be trusted */
    online?: boolean
    /** Whole minutes since the station's last report; `undefined` while unknown */
    minutesAgo?: number
}

/** The weather at the observatory now: the temperature, the overall safety and every sensor against its limit */
export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, loading, error, online = false, minutesAgo }) => {
    const { t } = useTranslation()

    const state = getWeatherState(weather)

    const labels: Record<WeatherKey, string> = {
        temperature: t('components.pages.observatory.weather.label-temperature', 'Температура'),
        humidity: t('components.pages.observatory.weather.label-humidity', 'Влажность'),
        clouds: t('components.pages.observatory.weather.label-clouds', 'Облачность'),
        windSpeed: t('components.pages.observatory.weather.label-wind-speed', 'Ветер'),
        windGust: t('components.pages.observatory.weather.label-wind-gust', 'Порывы'),
        precipitation: t('components.pages.observatory.weather.label-precipitation', 'Осадки')
    }

    const units: Record<WeatherKey, string> = {
        temperature: '℃',
        humidity: '%',
        clouds: '%',
        windSpeed: t('components.pages.observatory.weather.unit-wind', 'м/с'),
        windGust: t('components.pages.observatory.weather.unit-wind', 'м/с'),
        precipitation: t('components.pages.observatory.weather.unit-precipitation', 'мм')
    }

    const rangeLabels: Record<WeatherRange, string> = {
        good: t('components.pages.observatory.weather.safely', 'Безопасно'),
        warning: t('components.pages.observatory.weather.dangerous', 'Опасное'),
        danger: t('components.pages.observatory.weather.critical', 'Критическое')
    }

    return (
        <Container
            className={styles.weatherCard}
            header={
                <CardTitle icon={'Cloud'}>{t('components.pages.observatory.weather.title', 'Погода сейчас')}</CardTitle>
            }
            action={
                <span className={styles.actions}>
                    <LiveMeta
                        online={online}
                        minutesAgo={minutesAgo}
                    />
                    <Link
                        href={'/observatory/weather'}
                        className={styles.more}
                        title={t(
                            'components.pages.observatory.weather.observatory-in-orenburg-weather',
                            'Погода в Обсерватории Оренбурга'
                        )}
                    >
                        {t('components.pages.observatory.weather.read-more', 'Подробнее')}
                    </Link>
                </span>
            }
        >
            {error && !weather && (
                <Message type={'error'}>
                    {t('components.pages.observatory.weather.error', 'Метеостанция не отвечает')}
                </Message>
            )}

            <div className={styles.top}>
                {loading ? (
                    <Skeleton className={styles.topSkeleton} />
                ) : !weather ? null : (
                    <>
                        <div className={styles.temperature}>
                            {typeof weather.temperature === 'number' ? Math.round(weather.temperature) : '—'}
                            <sup>{'℃'}</sup>
                        </div>
                        <div className={styles.description}>
                            <b>
                                {t('components.pages.observatory.weather.feels-like', 'Ощущается как {{value}}°', {
                                    value: typeof weather.feelsLike === 'number' ? Math.round(weather.feelsLike) : '—'
                                })}
                            </b>
                            <span>
                                {t(
                                    'components.pages.observatory.weather.pressure-dew',
                                    'Давление {{pressure}} гПа · точка росы {{dewPoint}}°',
                                    {
                                        pressure:
                                            typeof weather.pressure === 'number' ? Math.round(weather.pressure) : '—',
                                        dewPoint:
                                            typeof weather.dewPoint === 'number' ? Math.round(weather.dewPoint) : '—'
                                    }
                                )}
                            </span>
                        </div>
                        {state && (
                            <StatusBadge
                                tone={RANGE_TONES[state]}
                                dot={true}
                                className={styles.state}
                            >
                                {rangeLabels[state]}
                            </StatusBadge>
                        )}
                    </>
                )}
            </div>

            <dl className={styles.metrics}>
                {WEATHER_KEYS.map((key) => {
                    const value = weather?.[key]
                    const range = getWeatherRange(key, value)

                    return (
                        <div
                            key={key}
                            className={cn(styles.metric, range && styles[range])}
                        >
                            <dt>
                                <span
                                    className={styles.dot}
                                    aria-hidden={'true'}
                                />
                                {labels[key]}
                                {range && <span className={'visuallyHidden'}>{` (${rangeLabels[range]})`}</span>}
                            </dt>
                            <dd>
                                {loading ? (
                                    <Skeleton className={styles.valueSkeleton} />
                                ) : (
                                    <>
                                        {value ?? '—'} <small>{units[key]}</small>
                                    </>
                                )}
                            </dd>
                            <span
                                className={styles.meter}
                                aria-hidden={'true'}
                            >
                                <i style={{ width: `${getWeatherMeter(key, value)}%` }} />
                            </span>
                        </div>
                    )
                })}
            </dl>
        </Container>
    )
}
