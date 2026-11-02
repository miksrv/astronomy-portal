import React, { useMemo } from 'react'
import { cn, Container, Skeleton } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { MoonPhaseIcon } from '@/components/common/moon-phase-icon'
import { CardMeta, CardTitle } from '@/components/ui'
import { formatObservatoryTime, getNight, getNightPosition, OBSERVATORY_LAT, OBSERVATORY_LON } from '@/utils/visibility'

import { getSkyState, getSkyTimeline } from './utils'

import styles from './styles.module.sass'

const AXIS = ['12:00', '18:00', '00:00', '06:00', '12:00']

interface SkyCardProps {
    /** The current time; `undefined` until hydrated */
    now?: Date
}

/** The Sun and the Moon over the observatory, and the coming night as day, twilight and darkness */
export const SkyCard: React.FC<SkyCardProps> = ({ now }) => {
    const { t, i18n } = useTranslation()

    const data = useMemo(() => {
        if (!now) {
            return undefined
        }

        const night = getNight(now, 15)

        return {
            sky: getSkyState(now),
            timeline: getSkyTimeline(night.samples.slice(0, -1)),
            position: getNightPosition(night, now)
        }
    }, [now])

    const time = (date?: Date | null) => formatObservatoryTime(date ?? undefined, i18n.language)

    const moonPhase = !data
        ? ''
        : data.sky.moon.phase < 0.03 || data.sky.moon.phase > 0.97
          ? t('components.pages.observatory.sky-card.new-moon', 'новолуние')
          : data.sky.moon.phase < 0.47
            ? t('components.pages.observatory.sky-card.waxing', 'растущая')
            : data.sky.moon.phase < 0.53
              ? t('components.pages.observatory.sky-card.full-moon', 'полнолуние')
              : t('components.pages.observatory.sky-card.waning', 'убывающая')

    const phaseLabels = {
        day: t('components.pages.observatory.sky-card.day', 'День'),
        twilight: t('components.pages.observatory.sky-card.twilight', 'Сумерки'),
        night: t('components.pages.observatory.sky-card.night', 'Астрономическая ночь')
    }

    const row = (label: string, value: React.ReactNode) => (
        <div className={styles.row}>
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    )

    return (
        <Container
            className={styles.skyCard}
            header={
                <CardTitle icon={'Moon'}>{t('components.pages.observatory.sky-card.title', 'Солнце и Луна')}</CardTitle>
            }
            action={
                <CardMeta>
                    {t('components.pages.observatory.sky-card.coordinates', '{{lat}}° с. ш., {{lon}}° в. д.', {
                        lat: OBSERVATORY_LAT,
                        lon: OBSERVATORY_LON
                    })}
                </CardMeta>
            }
        >
            <div className={styles.bodies}>
                <div className={styles.body}>
                    <h3 className={styles.bodyName}>
                        <span className={styles.sun} />
                        {t('components.pages.observatory.sky-card.sun', 'Солнце')}
                    </h3>
                    <dl className={styles.rows}>
                        {data ? (
                            <>
                                {row(
                                    t('components.pages.observatory.sky-card.dawn', 'Восход'),
                                    time(data.sky.sun.rise)
                                )}
                                {row(
                                    t('components.pages.observatory.sky-card.sunset', 'Закат'),
                                    time(data.sky.sun.set)
                                )}
                                {row(
                                    t('components.pages.observatory.sky-card.height', 'Высота'),
                                    `${data.sky.sun.altitude.toFixed(1)}°`
                                )}
                                {row(
                                    t('components.pages.observatory.sky-card.azimuth', 'Азимут'),
                                    `${Math.round(data.sky.sun.azimuth)}°`
                                )}
                            </>
                        ) : (
                            <Skeleton className={styles.rowsSkeleton} />
                        )}
                    </dl>
                </div>
                <div className={styles.body}>
                    <h3 className={styles.bodyName}>
                        {now && <MoonPhaseIcon date={now} />}
                        {t('components.pages.observatory.sky-card.moon', 'Луна')}
                        {moonPhase && ` · ${moonPhase}`}
                    </h3>
                    <dl className={styles.rows}>
                        {data ? (
                            <>
                                {row(
                                    t('components.pages.observatory.sky-card.dawn', 'Восход'),
                                    time(data.sky.moon.rise)
                                )}
                                {row(
                                    t('components.pages.observatory.sky-card.moonset', 'Заход'),
                                    time(data.sky.moon.set)
                                )}
                                {row(
                                    t('components.pages.observatory.sky-card.height', 'Высота'),
                                    `${data.sky.moon.altitude.toFixed(1)}°`
                                )}
                                {row(
                                    t('components.pages.observatory.sky-card.illumination', 'Освещённость'),
                                    `${Math.round(data.sky.moon.fraction * 100)}%`
                                )}
                            </>
                        ) : (
                            <Skeleton className={styles.rowsSkeleton} />
                        )}
                    </dl>
                </div>
            </div>

            <div>
                <div
                    className={styles.timeline}
                    role={'img'}
                    aria-label={t(
                        'components.pages.observatory.sky-card.timeline',
                        'Сумерки и ночь с полудня до полудня; отметка — текущее время'
                    )}
                >
                    {data?.timeline.map(({ phase, share }, i) => (
                        <i
                            key={i}
                            className={styles[phase]}
                            style={{ flexGrow: share }}
                        />
                    ))}
                    {data && (
                        <span
                            className={styles.now}
                            style={{ left: `${data.position * 100}%` }}
                        />
                    )}
                </div>
                <div
                    className={styles.axis}
                    aria-hidden={'true'}
                >
                    {AXIS.map((tick, i) => (
                        <span key={i}>{tick}</span>
                    ))}
                </div>
            </div>

            <div
                className={styles.legend}
                aria-hidden={'true'}
            >
                {(['day', 'twilight', 'night'] as const).map((phase) => (
                    <span key={phase}>
                        <i className={cn(styles[phase])} />
                        {phaseLabels[phase]}
                    </span>
                ))}
            </div>
        </Container>
    )
}
