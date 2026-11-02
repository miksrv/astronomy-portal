import React, { useMemo } from 'react'
import { cn, Container, Icon, Message, Skeleton } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { CardMeta, CardTitle } from '@/components/ui'
import { formatCalendarDate } from '@/utils/dates'
import { formatObservatoryTime, getObservatoryDate } from '@/utils/visibility'
import { isGoodForecastNight } from '@/utils/weather'
import { getWeatherKind, WEATHER_KIND_ICONS, WeatherKind } from '@/utils/weatherIcons'

import { getTonightHours, parseMeteoDate } from './utils'

import styles from './styles.module.sass'

const DAYS = 7

interface ForecastCardProps {
    daily?: ApiModel.Weather[]
    hourly?: ApiModel.Weather[]
    /** The current time; `undefined` until hydrated */
    now?: Date
    loading?: boolean
    /** Both forecast requests failed */
    error?: boolean
    className?: string
}

/** Clouds ahead: the coming night hour by hour, then the week with the nights worth planning for */
export const ForecastCard: React.FC<ForecastCardProps> = ({ daily, hourly, now, loading, error, className }) => {
    const { t, i18n } = useTranslation()

    const tonight = useMemo(() => (now ? getTonightHours(hourly, now) : []), [hourly, now])

    const kindLabels: Record<WeatherKind, string> = {
        clear: t('components.pages.observatory.forecast-card.kind-clear', 'Ясно'),
        partly: t('components.pages.observatory.forecast-card.kind-partly', 'Переменная облачность'),
        cloudy: t('components.pages.observatory.forecast-card.kind-cloudy', 'Облачно'),
        rain: t('components.pages.observatory.forecast-card.kind-rain', 'Дождь'),
        snow: t('components.pages.observatory.forecast-card.kind-snow', 'Снег'),
        storm: t('components.pages.observatory.forecast-card.kind-storm', 'Гроза'),
        fog: t('components.pages.observatory.forecast-card.kind-fog', 'Туман')
    }
    // The forecast's days are the observatory's calendar days: "today" is its date, not UTC's
    // (after local midnight the night in progress belongs to yesterday's row, which is gone)
    const todayDate = now ? getObservatoryDate(now) : undefined
    const days = (daily ?? []).slice(0, DAYS)

    return (
        <Container
            className={cn(styles.forecastCard, className)}
            header={
                <CardTitle icon={'Calendar'}>
                    {t('components.pages.observatory.forecast-card.title', 'Прогноз облачности')}
                </CardTitle>
            }
            action={
                <CardMeta>
                    {t(
                        'components.pages.observatory.forecast-card.legend',
                        'Зелёным — ночи без облаков, осадков и ветра'
                    )}
                </CardMeta>
            }
        >
            {error && (
                <Message type={'error'}>
                    {t('components.pages.observatory.forecast-card.error', 'Прогноз недоступен')}
                </Message>
            )}

            <div className={styles.block}>
                <h3 className={styles.subtitle}>
                    {t('components.pages.observatory.forecast-card.tonight', 'Ближайшая ночь по часам')}
                </h3>
                {loading || !now ? (
                    <Skeleton className={styles.hoursSkeleton} />
                ) : tonight.length ? (
                    <ol className={styles.hours}>
                        {tonight.map((hour) => {
                            // No cloud reading is not a clear sky: the bar stays empty and the value a dash
                            const clouds = hour.clouds == null ? undefined : Math.round(hour.clouds)
                            const time = formatObservatoryTime(parseMeteoDate(hour.date), i18n.language)

                            return (
                                <li
                                    key={hour.date}
                                    className={cn(styles.hour, clouds != null && clouds < 30 && styles.clear)}
                                    title={t(
                                        'components.pages.observatory.forecast-card.hour-title',
                                        '{{time}}: облачность {{clouds}}%, ветер {{wind}} м/с',
                                        { time, clouds: clouds ?? '—', wind: hour.windSpeed ?? '?' }
                                    )}
                                >
                                    <span
                                        className={styles.hourBar}
                                        aria-hidden={'true'}
                                    >
                                        <i style={{ height: `${Math.max(4, clouds ?? 0)}%` }} />
                                    </span>
                                    <span className={styles.hourValue}>{clouds == null ? '—' : `${clouds}%`}</span>
                                    <span className={styles.hourTime}>{time.slice(0, 2)}</span>
                                </li>
                            )
                        })}
                    </ol>
                ) : (
                    <p className={styles.empty}>
                        {t(
                            'components.pages.observatory.forecast-card.no-hourly',
                            'Почасового прогноза на эту ночь нет'
                        )}
                    </p>
                )}
            </div>

            <div className={styles.block}>
                <h3 className={styles.subtitle}>{t('components.pages.observatory.forecast-card.week', 'На неделю')}</h3>
                {loading ? (
                    <Skeleton className={styles.daysSkeleton} />
                ) : !days.length ? (
                    <p className={styles.empty}>
                        {t('components.pages.observatory.forecast-card.no-daily', 'Прогноза на неделю пока нет')}
                    </p>
                ) : (
                    <ol className={styles.days}>
                        {days.map((day) => {
                            const good = isGoodForecastNight(day)
                            const clouds = day.clouds == null ? undefined : Math.round(day.clouds)
                            const isToday = !!now && day.date?.slice(0, 10) === todayDate
                            const kind = getWeatherKind(day.weatherId, day.clouds)
                            const high = Math.round(day.temperatureMax ?? day.temperature ?? 0)
                            const low = Math.round(day.temperatureMin ?? day.temperature ?? 0)

                            return (
                                <li
                                    key={day.date}
                                    className={cn(styles.day, good && styles.good)}
                                >
                                    <span className={cn(styles.dayName, isToday && styles.today)}>
                                        {isToday
                                            ? t('components.pages.observatory.forecast-card.today', 'Сегодня')
                                            : formatCalendarDate(day.date, i18n.language, {
                                                  weekday: 'short',
                                                  day: 'numeric'
                                              })}
                                    </span>
                                    <span
                                        className={cn(styles.kindIcon, styles[kind])}
                                        title={kindLabels[kind]}
                                    >
                                        <Icon name={WEATHER_KIND_ICONS[kind]} />
                                        <span className={'visuallyHidden'}>{kindLabels[kind]}</span>
                                    </span>
                                    <span className={styles.clouds}>
                                        <b>{clouds == null ? '—' : `${clouds}%`}</b>
                                        <small>
                                            {t('components.pages.observatory.forecast-card.clouds-label', 'облачность')}
                                        </small>
                                    </span>
                                    <span className={styles.temperature}>
                                        <span>
                                            <b>{`${high}°`}</b>
                                            <small>
                                                {t('components.pages.observatory.forecast-card.day-label', 'днём')}
                                            </small>
                                        </span>
                                        <span>
                                            <b>{`${low}°`}</b>
                                            <small>
                                                {t('components.pages.observatory.forecast-card.night-label', 'ночью')}
                                            </small>
                                        </span>
                                    </span>
                                    <span className={cn(styles.verdict, good && styles.goodVerdict)}>
                                        {good
                                            ? t(
                                                  'components.pages.observatory.forecast-card.good-night',
                                                  'подходит для съёмки'
                                              )
                                            : t(
                                                  'components.pages.observatory.forecast-card.bad-night',
                                                  'не для съёмки'
                                              )}
                                    </span>
                                </li>
                            )
                        })}
                    </ol>
                )}
            </div>
        </Container>
    )
}
