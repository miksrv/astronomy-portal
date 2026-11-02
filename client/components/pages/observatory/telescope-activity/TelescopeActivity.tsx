import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, cn, Container } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { CardTitle, SegmentedControl, StatGrid } from '@/components/ui'
import { formatCalendarDate, formatExposure } from '@/utils/dates'
import { formatObjectName } from '@/utils/strings'
import {
    ActivityDay,
    getActivityLevel,
    getActivityWeeks,
    getActivityYears,
    getYearTotals,
    TelescopeNight
} from '@/utils/telescopeActivity'

import styles from './styles.module.sass'

const LEVELS = [0, 1, 2, 3, 4] as const

/** Half the tooltip's `max-width` (styles): how far its centre must stay from the box's edges */
const TOOLTIP_HALF_WIDTH = 140

interface TelescopeActivityProps {
    nights: TelescopeNight[]
}

/**
 * A year of the telescope's work at a glance: a cell per day, shaded by the night's total
 * exposure, with the year's totals over it. Hovering a night shows what was shot.
 */
export const TelescopeActivity: React.FC<TelescopeActivityProps> = ({ nights }) => {
    const { t, i18n } = useTranslation()

    const years = useMemo(() => getActivityYears(nights), [nights])
    const [year, setYear] = useState<number>(years[years.length - 1] ?? new Date().getFullYear())
    const [hovered, setHovered] = useState<{ day: ActivityDay; left: number; top: number }>()

    const weeks = useMemo(() => getActivityWeeks(year, nights), [year, nights])
    const daysByDate = useMemo(() => new Map(weeks.flatMap(({ days }) => days).map((day) => [day.date, day])), [weeks])
    const scrollRef = useRef<HTMLDivElement>(null)

    // On a narrow screen the year scrolls sideways: start at its latest night, not at January
    useEffect(() => {
        const scroll = scrollRef.current
        const last = scroll?.querySelector<HTMLElement>('[data-night]:last-of-type')

        if (scroll && last && scroll.scrollWidth > scroll.clientWidth) {
            scroll.scrollLeft = Math.max(0, last.offsetLeft - scroll.clientWidth / 2)
        }
    }, [weeks])
    const totals = useMemo(() => getYearTotals(nights, year), [nights, year])

    const months = useMemo(
        () =>
            Array.from({ length: 12 }, (_, month) =>
                new Date(Date.UTC(2024, month, 1)).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'ru-RU', {
                    month: 'short',
                    timeZone: 'UTC'
                })
            ),
        [i18n.language]
    )

    // Hover or tap a cell: the night's details in a tooltip over it
    const handlePoint = (event: React.SyntheticEvent<HTMLElement>) => {
        const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-date]')
        const day = cell && daysByDate.get(cell.dataset.date ?? '')

        if (!cell || !day) {
            if (hovered) {
                setHovered(undefined)
            }

            return
        }

        if (event.type === 'mousemove' && hovered?.day.date === day.date) {
            return
        }

        const scroll = scrollRef.current

        if (!scroll) {
            return
        }

        // A tap on the night already shown puts the tooltip away (there is no mouseleave on touch)
        if (event.type === 'click' && hovered?.day.date === day.date) {
            setHovered(undefined)

            return
        }

        const cellBox = cell.getBoundingClientRect()
        const box = scroll.getBoundingClientRect()

        // Centred on the cell, but kept inside the scroll box: it clips what sticks out
        const left = cellBox.left - box.left + cellBox.width / 2 + scroll.scrollLeft
        const min = scroll.scrollLeft + TOOLTIP_HALF_WIDTH
        const max = scroll.scrollLeft + scroll.clientWidth - TOOLTIP_HALF_WIDTH

        setHovered({
            day,
            left: max > min ? Math.min(Math.max(left, min), max) : left,
            top: cellBox.top - box.top
        })
    }

    return (
        <Container
            className={styles.telescopeActivity}
            header={
                <CardTitle icon={'BarChart'}>
                    {t('components.pages.observatory.telescope-activity.title', 'Активность телескопа')}
                </CardTitle>
            }
        >
            {years.length > 1 && (
                <SegmentedControl<number>
                    className={styles.years}
                    aria-label={t('components.pages.observatory.telescope-activity.year', 'Год')}
                    options={years.map((key) => ({ key, label: key }))}
                    value={year}
                    onChange={setYear}
                />
            )}

            <StatGrid
                variant={'plate'}
                items={[
                    {
                        value: totals.nights,
                        label: t('components.pages.observatory.telescope-activity.nights', 'ночей съёмки')
                    },
                    {
                        value: Math.round(totals.exposure / 3600).toLocaleString(i18n.language),
                        unit: t('common.hours-unit', 'ч'),
                        label: t('components.pages.observatory.telescope-activity.exposure', 'суммарная выдержка')
                    },
                    {
                        value: totals.frames.toLocaleString(i18n.language),
                        label: t('components.pages.observatory.telescope-activity.frames', 'кадров')
                    },
                    {
                        value: totals.objects,
                        label: t('components.pages.observatory.telescope-activity.objects', 'объектов')
                    }
                ]}
            />

            {/* The heat map is a picture with details on demand: hover, tap or focus a night (a
                button) to read it; the year's totals and the nights list carry the same data */}
            <div
                ref={scrollRef}
                className={styles.scroll}
                onMouseMove={handlePoint}
                onMouseLeave={() => setHovered(undefined)}
            >
                <div
                    className={styles.heatmap}
                    role={'group'}
                    aria-label={t(
                        'components.pages.observatory.telescope-activity.heatmap-label',
                        'Ночи съёмки за {{year}} год: {{count}}',
                        { year, count: totals.nights }
                    )}
                >
                    {weeks.map((week, column) => (
                        <React.Fragment key={column}>
                            <span
                                className={styles.month}
                                style={{ gridColumn: column + 1 }}
                            >
                                {week.month !== undefined ? months[week.month] : ''}
                            </span>
                            {week.days.map((day, row) =>
                                day.night ? (
                                    <Button
                                        key={day.date}
                                        unstyled={true}
                                        data-date={day.date}
                                        data-night={''}
                                        className={cn(
                                            styles.cell,
                                            styles[`level${getActivityLevel(day.night.exposure)}`]
                                        )}
                                        style={{ gridColumn: column + 1, gridRow: row + 2 }}
                                        aria-label={`${formatCalendarDate(day.date, i18n.language)}: ${formatExposure(day.night.exposure, t)}`}
                                        onClick={handlePoint}
                                        onFocus={handlePoint}
                                        onBlur={() => setHovered(undefined)}
                                    />
                                ) : (
                                    <span
                                        key={day.date}
                                        data-date={day.inYear ? day.date : undefined}
                                        className={cn(day.inYear && styles.cell)}
                                        style={{ gridColumn: column + 1, gridRow: row + 2 }}
                                    />
                                )
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {hovered && (
                    <div
                        className={cn(styles.tooltip, hovered.top < 60 && styles.below)}
                        style={{ left: hovered.left, top: hovered.top }}
                        aria-hidden={'true'}
                    >
                        <b>
                            {formatCalendarDate(hovered.day.date, i18n.language, {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </b>
                        {hovered.day.night ? (
                            <>
                                <span>
                                    {formatExposure(hovered.day.night.exposure, t)}
                                    {' · '}
                                    {t('common.frames', '{{count}} кадров', { count: hovered.day.night.frames })}
                                </span>
                                <span className={styles.tooltipObjects}>
                                    {hovered.day.night.objects.map(formatObjectName).join(', ')}
                                </span>
                            </>
                        ) : (
                            <span>
                                {t('components.pages.observatory.telescope-activity.no-shooting', 'без съёмки')}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <span>
                    {t(
                        'components.pages.observatory.telescope-activity.legend',
                        'Каждая клетка — ночь; цвет — суммарная выдержка'
                    )}
                </span>
                <span
                    className={styles.scale}
                    aria-hidden={'true'}
                >
                    {t('components.pages.observatory.telescope-activity.less', 'меньше')}
                    {LEVELS.map((level) => (
                        <i
                            key={level}
                            className={cn(styles.cell, level > 0 && styles[`level${level}`])}
                        />
                    ))}
                    {t('components.pages.observatory.telescope-activity.more', 'больше')}
                </span>
            </div>
        </Container>
    )
}
