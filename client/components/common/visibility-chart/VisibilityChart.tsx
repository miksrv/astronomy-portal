import React, { useId, useMemo } from 'react'
import { cn, Container, Icon, Skeleton } from 'simple-react-ui-kit'
import * as SunCalc from 'suncalc'

import { useTranslation } from 'next-i18next/pages'

import { useNow } from '@/hooks/useNow'
import {
    formatObservatoryTime,
    getNight,
    getNightPosition,
    getVisibility,
    OBSERVATORY_LAT,
    OBSERVATORY_LON
} from '@/utils/visibility'

import {
    BASELINE,
    CHART_HEIGHT,
    CHART_WIDTH,
    getDarkSpans,
    getMoonPoints,
    getObjectPoints,
    PADDING,
    toX,
    toY
} from './utils'

import styles from './styles.module.sass'

const ALTITUDE_GRID = [0, 30, 60, 90]
const HOUR_TICKS = ['12:00', '18:00', '00:00', '06:00', '12:00']

/** A bright Moon above the horizon washes out broadband filters, not the narrowband ones */
const BRIGHT_MOON = 0.5

interface VisibilityChartProps {
    /** Right ascension, degrees */
    ra: number
    /** Declination, degrees */
    dec: number
    /** The object's name for the legend and the chart's text alternative */
    name: string
    className?: string
}

/**
 * How high the object climbs over the observatory tonight, from noon to noon: its altitude,
 * the Moon's, the dark hours shaded and the best moment marked. Drawn on the client only, as
 * it depends on the current time; the frame keeps its size until then.
 */
export const VisibilityChart: React.FC<VisibilityChartProps> = ({ ra, dec, name, className }) => {
    const { t, i18n } = useTranslation()
    const now = useNow(5 * 60_000)
    // Two charts on one page must not share a gradient id
    const gradientId = `${useId()}-fill`

    const chart = useMemo(() => {
        if (!now) {
            return undefined
        }

        const night = getNight(now)
        const visibility = getVisibility(ra, dec, night)
        const moonAtBest = visibility.time
            ? SunCalc.getMoonPosition(visibility.time, OBSERVATORY_LAT, OBSERVATORY_LON).altitude
            : -90

        return {
            night,
            visibility,
            objectPoints: getObjectPoints(night, ra, dec),
            moonPoints: getMoonPoints(night),
            darkSpans: getDarkSpans(night),
            nowX: toX(getNightPosition(night, now)),
            bestX: visibility.time ? toX(getNightPosition(night, visibility.time)) : undefined,
            moonFraction: SunCalc.getMoonIllumination(visibility.time ?? now).fraction,
            moonUp: moonAtBest > 0
        }
    }, [now, ra, dec])

    const isVisible = !!chart && chart.visibility.level !== 'none'
    const bestTime = formatObservatoryTime(chart?.visibility.time, i18n.language)
    const bestAltitude = Math.round(chart?.visibility.altitude ?? 0)

    return (
        <Container
            className={cn(styles.visibilityChart, className)}
            header={
                <h3 className={styles.title}>
                    {t('components.common.visibility-chart.title', 'Высота над горизонтом этой ночью')}
                </h3>
            }
            action={<span className={styles.meta}>{t('components.common.visibility-chart.place', 'Оренбург')}</span>}
        >
            <div className={styles.frame}>
                {chart && (
                    <svg
                        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                        role={'img'}
                        aria-label={
                            isVisible
                                ? t(
                                      'components.common.visibility-chart.aria-visible',
                                      'Высота {{name}} над горизонтом этой ночью: максимум {{altitude}}° в {{time}}',
                                      { name, altitude: bestAltitude, time: bestTime }
                                  )
                                : t(
                                      'components.common.visibility-chart.aria-hidden',
                                      '{{name}} этой ночью не поднимается достаточно высоко',
                                      { name }
                                  )
                        }
                    >
                        <defs>
                            <linearGradient
                                id={gradientId}
                                x1={'0'}
                                y1={'0'}
                                x2={'0'}
                                y2={'1'}
                            >
                                <stop
                                    offset={'0'}
                                    className={styles.fillTop}
                                />
                                <stop
                                    offset={'1'}
                                    className={styles.fillBottom}
                                />
                            </linearGradient>
                        </defs>

                        {chart.darkSpans.map(([from, to]) => (
                            <rect
                                key={from}
                                className={styles.dark}
                                x={toX(from)}
                                y={PADDING.top}
                                width={toX(to) - toX(from)}
                                height={BASELINE - PADDING.top}
                            />
                        ))}

                        {ALTITUDE_GRID.map((altitude) => (
                            <g key={altitude}>
                                <line
                                    className={styles.grid}
                                    x1={PADDING.left}
                                    x2={CHART_WIDTH - PADDING.right}
                                    y1={toY(altitude)}
                                    y2={toY(altitude)}
                                />
                                <text
                                    className={styles.axis}
                                    x={PADDING.left - 6}
                                    y={toY(altitude) + 4}
                                    textAnchor={'end'}
                                >
                                    {`${altitude}°`}
                                </text>
                            </g>
                        ))}

                        <polygon
                            className={styles.area}
                            fill={`url(#${gradientId})`}
                            points={`${PADDING.left},${BASELINE} ${chart.objectPoints} ${CHART_WIDTH - PADDING.right},${BASELINE}`}
                        />
                        <polyline
                            className={styles.object}
                            points={chart.objectPoints}
                        />
                        <polyline
                            className={styles.moon}
                            points={chart.moonPoints}
                        />

                        {chart.bestX !== undefined && isVisible && (
                            <circle
                                className={styles.best}
                                cx={chart.bestX}
                                cy={toY(chart.visibility.altitude)}
                                r={5}
                            />
                        )}

                        <line
                            className={styles.now}
                            x1={chart.nowX}
                            x2={chart.nowX}
                            y1={PADDING.top}
                            y2={BASELINE}
                        />
                        <text
                            className={styles.nowLabel}
                            x={chart.nowX + (chart.nowX > CHART_WIDTH - 60 ? -4 : 4)}
                            y={PADDING.top + 10}
                            textAnchor={chart.nowX > CHART_WIDTH - 60 ? 'end' : 'start'}
                        >
                            {t('components.common.visibility-chart.now', 'сейчас')}
                        </text>

                        {HOUR_TICKS.map((tick, i) => (
                            <text
                                key={i}
                                className={styles.axis}
                                x={toX(i / (HOUR_TICKS.length - 1))}
                                y={CHART_HEIGHT - 6}
                                textAnchor={i === 0 ? 'start' : i === HOUR_TICKS.length - 1 ? 'end' : 'middle'}
                            >
                                {tick}
                            </text>
                        ))}
                    </svg>
                )}
            </div>

            <div
                className={styles.legend}
                aria-hidden={'true'}
            >
                <span>
                    <i className={styles.legendObject} />
                    {name}
                </span>
                <span>
                    <i className={styles.legendMoon} />
                    {t('components.common.visibility-chart.moon', 'Луна')}
                </span>
                <span>
                    <i className={styles.legendDark} />
                    {t('components.common.visibility-chart.dark', 'Темно (Солнце ниже −12°)')}
                </span>
            </div>

            {chart ? (
                <p className={cn(styles.note, isVisible ? styles.good : styles.warning)}>
                    <Icon name={isVisible ? 'CheckCircle' : 'ReportError'} />
                    <span>
                        {isVisible
                            ? t(
                                  'components.common.visibility-chart.best-time',
                                  'Лучшее время — {{time}}, высота {{altitude}}°',
                                  { time: bestTime, altitude: bestAltitude }
                              )
                            : t(
                                  'components.common.visibility-chart.too-low',
                                  'Этой ночью объект слишком низко для съёмки'
                              )}
                        {isVisible &&
                            chart.moonUp &&
                            chart.moonFraction > BRIGHT_MOON &&
                            t(
                                'components.common.visibility-chart.bright-moon',
                                '. Луна {{percent}}% — подойдут узкополосные фильтры Hα, OIII, SII',
                                { percent: Math.round(chart.moonFraction * 100) }
                            )}
                    </span>
                </p>
            ) : (
                <Skeleton className={styles.noteSkeleton} />
            )}
        </Container>
    )
}
