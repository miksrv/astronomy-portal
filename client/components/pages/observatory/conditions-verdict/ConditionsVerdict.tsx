import React from 'react'
import { cn, Icon, Skeleton } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { formatObservatoryTime } from '@/utils/visibility'
import { getObservingVerdict, getWeatherState, ObservingVerdict } from '@/utils/weather'

import { getSkyPhase, getSkyState } from '../sky-card/utils'

import styles from './styles.module.sass'

interface ConditionsVerdictProps {
    weather?: ApiModel.Weather
    /** The station reported recently; a stale or missing feed gives the "unknown" verdict */
    online?: boolean
    /** The first weather request is still in flight */
    loading?: boolean
    /** The current time; `undefined` until hydrated */
    now?: Date
}

/**
 * "Can the telescope shoot now?" in one line: the weather combined with darkness and
 * moonlight, with the local time, the Sun's altitude and the Moon beside it.
 */
export const ConditionsVerdict: React.FC<ConditionsVerdictProps> = ({ weather, online, loading, now }) => {
    const { t, i18n } = useTranslation()

    const sky = now ? getSkyState(now) : undefined
    // Until hydrated or while the first request runs: a skeleton. No weather or a stale feed: "unknown"
    const result =
        sky && !loading
            ? getObservingVerdict(
                  online && weather ? getWeatherState(weather) : undefined,
                  sky.sun.altitude,
                  sky.moon.altitude,
                  sky.moon.fraction
              )
            : undefined

    const texts: Record<ObservingVerdict, { title: string; text: string }> = {
        'clear-dark': {
            title: t('components.pages.observatory.conditions-verdict.clear-title', 'Отличные условия для съёмки'),
            text: t(
                'components.pages.observatory.conditions-verdict.clear-dark',
                'Ясно и темно — телескоп может работать'
            )
        },
        'clear-bright-moon': {
            title: t('components.pages.observatory.conditions-verdict.clear-title', 'Отличные условия для съёмки'),
            text: t(
                'components.pages.observatory.conditions-verdict.clear-moon',
                'Ясно, но Луна яркая — лучше узкополосные фильтры'
            )
        },
        'waiting-darkness': {
            title: t('components.pages.observatory.conditions-verdict.waiting-title', 'Погода хорошая, ждём темноты'),
            text: t(
                'components.pages.observatory.conditions-verdict.waiting-text',
                'Съёмка начнётся после астрономических сумерек'
            )
        },
        borderline: {
            title: t('components.pages.observatory.conditions-verdict.borderline-title', 'Условия на грани'),
            text: t(
                'components.pages.observatory.conditions-verdict.borderline-text',
                'Один из датчиков у предела — телескоп ждёт, пока погода определится'
            )
        },
        closed: {
            title: t('components.pages.observatory.conditions-verdict.closed-title', 'Съёмка невозможна'),
            text: t(
                'components.pages.observatory.conditions-verdict.closed-text',
                'Обсерватория закрыта, пока погода не улучшится'
            )
        },
        unknown: {
            title: t('components.pages.observatory.conditions-verdict.unknown-title', 'Нет данных о погоде'),
            text: t(
                'components.pages.observatory.conditions-verdict.unknown-text',
                'Метеостанция не отвечает — решение о съёмке отложено'
            )
        }
    }

    const phaseLabels = {
        day: t('components.pages.observatory.conditions-verdict.day', 'день'),
        twilight: t('components.pages.observatory.conditions-verdict.twilight', 'сумерки'),
        night: t('components.pages.observatory.conditions-verdict.night', 'ночь')
    }

    return (
        <section
            className={styles.conditionsVerdict}
            aria-label={t('components.pages.observatory.conditions-verdict.label', 'Условия для съёмки')}
        >
            <div className={styles.main}>
                {result ? (
                    <>
                        <span className={cn(styles.icon, styles[result.level])}>
                            <Icon name={result.level === 'good' ? 'CheckCircle' : 'ReportError'} />
                        </span>
                        {/* Announced when the verdict changes; the clock and altitudes beside it stay quiet */}
                        <div aria-live={'polite'}>
                            <p className={styles.title}>{texts[result.verdict].title}</p>
                            <p className={styles.text}>{texts[result.verdict].text}</p>
                        </div>
                    </>
                ) : (
                    <>
                        <Skeleton className={styles.iconSkeleton} />
                        <div className={styles.textSkeleton}>
                            <Skeleton />
                            <Skeleton />
                        </div>
                    </>
                )}
            </div>

            <dl className={styles.kpis}>
                <div>
                    <dt>{t('components.pages.observatory.conditions-verdict.local-time', 'Местное время')}</dt>
                    <dd>
                        {now ? formatObservatoryTime(now, i18n.language) : <Skeleton className={styles.kpiSkeleton} />}
                        {now && <small>{'UTC+5'}</small>}
                    </dd>
                </div>
                <div>
                    <dt>{t('components.pages.observatory.conditions-verdict.sun-altitude', 'Высота Солнца')}</dt>
                    <dd>
                        {sky ? (
                            <>
                                {`${Math.round(sky.sun.altitude)}°`}
                                <small>{phaseLabels[getSkyPhase(sky.sun.altitude)]}</small>
                            </>
                        ) : (
                            <Skeleton className={styles.kpiSkeleton} />
                        )}
                    </dd>
                </div>
                <div>
                    <dt>{t('components.pages.observatory.conditions-verdict.moon', 'Луна')}</dt>
                    <dd>
                        {sky ? (
                            <>
                                {`${Math.round(sky.moon.fraction * 100)}%`}
                                <small>
                                    {sky.moon.altitude > 0
                                        ? t('components.pages.observatory.conditions-verdict.moon-up', 'над горизонтом')
                                        : t(
                                              'components.pages.observatory.conditions-verdict.moon-down',
                                              'под горизонтом'
                                          )}
                                </small>
                            </>
                        ) : (
                            <Skeleton className={styles.kpiSkeleton} />
                        )}
                    </dd>
                </div>
            </dl>
        </section>
    )
}
