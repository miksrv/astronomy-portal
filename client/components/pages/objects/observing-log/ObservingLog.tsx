import React, { useMemo, useRef, useState } from 'react'
import { Button, Container, Icon, Message, Skeleton, Table, TableColumnProps } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { FilterTag } from '@/components/common/filter-tag'
import { MoonPhaseIcon } from '@/components/common/moon-phase-icon'
import { formatCalendarDate, formatExposure } from '@/utils/dates'
import { FILTERS_ORDER } from '@/utils/filters'
import { ObservingFrame, ObservingNight } from '@/utils/observingLog'
import { formatObservatoryTime } from '@/utils/visibility'

import { ACCUM_HEIGHT, ACCUM_PLOT, ACCUM_WIDTH, getAccumulatedChart } from './utils'

import styles from './styles.module.sass'

/** Nights shown before "Show all" */
const VISIBLE_NIGHTS = 6

interface ObservingLogProps {
    nights: ObservingNight[]
    loading?: boolean
    /** The frames request failed: the log can't tell empty from broken */
    error?: boolean
    onRetry?: () => void
}

/**
 * The object's observing log: the exposure accumulated night after night, then the nights
 * themselves - filters, Moon, sensor temperature and totals - each opening into its frames.
 */
export const ObservingLog: React.FC<ObservingLogProps> = ({ nights, loading, error, onRetry }) => {
    const { t, i18n } = useTranslation()
    const [showAll, setShowAll] = useState(false)
    // The nights opened so far: only their frame tables are in the DOM (a long log has thousands of frames)
    const [openNights, setOpenNights] = useState<Set<string>>(() => new Set())
    const listRef = useRef<HTMLDivElement>(null)

    const chart = useMemo(() => getAccumulatedChart(nights), [nights])
    const totalExposure = nights.reduce((sum, { exposure }) => sum + exposure, 0)
    const visibleNights = showAll ? nights : nights.slice(0, VISIBLE_NIGHTS)

    const frameColumns: Array<TableColumnProps<ObservingFrame>> = [
        {
            accessor: 'time',
            header: t('components.pages.objects.observing-log.time', 'Время'),
            formatter: (time) => formatObservatoryTime(new Date(time as string), i18n.language)
        },
        {
            accessor: 'filter',
            header: t('components.pages.objects.observing-log.filter', 'Фильтр'),
            formatter: (filter) => <FilterTag filter={filter as ObservingFrame['filter']} />
        },
        {
            accessor: 'exposure',
            header: t('components.pages.objects.observing-log.exposure', 'Выдержка'),
            formatter: (exposure) =>
                t('components.pages.objects.observing-log.seconds', '{{seconds}} с', { seconds: exposure })
        },
        { accessor: 'gain', header: 'Gain' },
        { accessor: 'offset', header: 'Offset' },
        {
            accessor: 'ccdTemp',
            header: t('components.pages.objects.observing-log.ccd', 'Матрица'),
            formatter: (temp) => (typeof temp === 'number' ? `${temp}°` : '—')
        },
        {
            accessor: 'fileName',
            header: t('components.pages.objects.observing-log.file', 'Файл'),
            className: styles.file
        }
    ]

    if (loading) {
        return (
            <div className={styles.observingLog}>
                <Skeleton className={styles.chartSkeleton} />
                <div className={styles.nights}>
                    {Array.from({ length: VISIBLE_NIGHTS }, (_, i) => (
                        <Skeleton
                            key={i}
                            className={styles.nightSkeleton}
                        />
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <Message type={'error'}>
                {t('components.pages.objects.observing-log.error', 'Не удалось загрузить кадры.')}{' '}
                {onRetry && (
                    <Button
                        mode={'link'}
                        size={'small'}
                        label={t('components.pages.objects.observing-log.retry', 'Повторить')}
                        onClick={onRetry}
                    />
                )}
            </Message>
        )
    }

    if (!nights.length) {
        return (
            <p className={styles.empty}>
                {t('components.pages.objects.observing-log.empty', 'По этому объекту в архиве ещё нет кадров.')}
            </p>
        )
    }

    return (
        <div className={styles.observingLog}>
            {chart && (
                <Container
                    className={styles.accumulated}
                    header={
                        <h3 className={styles.cardTitle}>
                            {t('components.pages.objects.observing-log.accumulated', 'Накопленная выдержка')}
                        </h3>
                    }
                    action={
                        <span className={styles.meta}>
                            {t('components.pages.objects.observing-log.by-nights', 'по ночам съёмки')}
                        </span>
                    }
                >
                    <svg
                        viewBox={`0 0 ${ACCUM_WIDTH} ${ACCUM_HEIGHT}`}
                        preserveAspectRatio={'none'}
                        role={'img'}
                        aria-label={t(
                            'components.pages.objects.observing-log.accumulated-label',
                            'Накопленная выдержка {{exposure}} за {{count}} ночей',
                            { exposure: formatExposure(totalExposure, t), count: nights.length }
                        )}
                    >
                        {chart.years.map(({ x, year, line }) => (
                            <g key={year}>
                                {line && (
                                    <line
                                        className={styles.gridLine}
                                        x1={x}
                                        x2={x}
                                        y1={ACCUM_PLOT.top}
                                        y2={ACCUM_PLOT.bottom}
                                    />
                                )}
                            </g>
                        ))}
                        <polygon
                            className={styles.area}
                            points={chart.area}
                        />
                        <polyline
                            className={styles.line}
                            points={chart.points}
                        />
                    </svg>
                    {/* Labels and dots in HTML over the stretched SVG, so they keep their shape */}
                    <div
                        className={styles.overlay}
                        aria-hidden={'true'}
                    >
                        {chart.dots.map(({ x, y, date, exposure }) => (
                            <span
                                key={date}
                                className={styles.dot}
                                style={{ left: `${(x / ACCUM_WIDTH) * 100}%`, top: `${(y / ACCUM_HEIGHT) * 100}%` }}
                                title={`${formatCalendarDate(date, i18n.language)}: +${formatExposure(exposure, t)}`}
                            />
                        ))}
                        {chart.years.map(({ x, year }) => (
                            <span
                                key={year}
                                className={styles.year}
                                style={{ left: `${(x / ACCUM_WIDTH) * 100}%` }}
                            >
                                {year}
                            </span>
                        ))}
                    </div>
                </Container>
            )}

            <div
                ref={listRef}
                className={styles.nights}
            >
                {visibleNights.map((night) => (
                    <details
                        key={night.date}
                        className={styles.night}
                        onToggle={(event) => {
                            const { open } = event.currentTarget

                            setOpenNights((current) => {
                                if (current.has(night.date) === open) {
                                    return current
                                }

                                const next = new Set(current)

                                if (open) {
                                    next.add(night.date)
                                } else {
                                    next.delete(night.date)
                                }

                                return next
                            })
                        }}
                    >
                        <summary>
                            <span className={styles.date}>
                                <b>
                                    {formatCalendarDate(night.date, i18n.language, { day: 'numeric', month: 'short' })}
                                </b>
                                <span>
                                    {night.date.slice(0, 4)}
                                    {' · '}
                                    {formatCalendarDate(night.date, i18n.language, { weekday: 'short' })}
                                </span>
                            </span>
                            <span className={styles.filters}>
                                {FILTERS_ORDER.filter((filter) => night.filters[filter]).map((filter) => (
                                    <FilterTag
                                        key={filter}
                                        filter={filter}
                                    >
                                        {` × ${night.filters[filter]}`}
                                    </FilterTag>
                                ))}
                            </span>
                            <span className={styles.conditions}>
                                <span>
                                    <MoonPhaseIcon date={`${night.date}T19:00:00Z`} />
                                    {t('components.pages.objects.observing-log.moon', 'Луна {{percent}}%', {
                                        percent: Math.round(night.moon * 100)
                                    })}
                                </span>
                                {typeof night.ccdTemp === 'number' && (
                                    <span>
                                        {t('components.pages.objects.observing-log.ccd-temp', 'Матрица {{temp}}°', {
                                            temp: night.ccdTemp
                                        })}
                                    </span>
                                )}
                            </span>
                            <span className={styles.total}>
                                <b>{formatExposure(night.exposure, t)}</b>
                                <span>{t('common.frames', '{{count}} кадров', { count: night.frames.length })}</span>
                            </span>
                            <Icon
                                name={'KeyboardDown'}
                                className={styles.chevron}
                            />
                        </summary>
                        <div className={styles.frames}>
                            {openNights.has(night.date) && (
                                <Table<ObservingFrame>
                                    size={'small'}
                                    columns={frameColumns}
                                    data={night.frames}
                                />
                            )}
                        </div>
                    </details>
                ))}
            </div>

            <div className={styles.footer}>
                {nights.length > VISIBLE_NIGHTS && (
                    <Button
                        mode={'secondary'}
                        label={
                            showAll
                                ? t('components.pages.objects.observing-log.collapse', 'Свернуть')
                                : t('components.pages.objects.observing-log.show-all', 'Показать все {{count}} ночей', {
                                      count: nights.length
                                  })
                        }
                        onClick={() => {
                            setShowAll(!showAll)

                            // Collapsing removes the rows above the button: bring the list back into view
                            if (showAll) {
                                listRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
                            }
                        }}
                    />
                )}
                <span>
                    {t(
                        'components.pages.objects.observing-log.hint',
                        'Откройте ночь, чтобы увидеть каждый кадр: фильтр, выдержку, gain, offset и температуру матрицы'
                    )}
                </span>
            </div>
        </div>
    )
}
