import React from 'react'
import { cn, Container } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { FilterSpectrum } from '@/components/common/filter-spectrum'
import { getFilterColor } from '@/utils/colors'
import { formatExposure } from '@/utils/dates'
import { FILTER_LABELS, getFilterExposures } from '@/utils/filters'

import { getSignalSummary } from './utils'

import styles from './styles.module.sass'

interface ObjectFiltersProps {
    filters?: ApiModel.Filters
    statistic?: ApiModel.Statistic
    /** Observing nights, for the exposure gathered per night */
    nights?: number
    className?: string
}

/**
 * How the signal was collected: a bar per filter and their shares of the total, then the
 * figures behind them - narrowband vs broadband, a typical frame and a typical night.
 */
export const ObjectFilters: React.FC<ObjectFiltersProps> = ({ filters, statistic, nights, className }) => {
    const { t } = useTranslation()

    const rows = getFilterExposures(filters)
    const max = Math.max(...rows.map(({ exposure }) => exposure), 1)
    const summary = getSignalSummary(filters, statistic, nights)
    const narrowbandPercent = Math.round(summary.narrowbandShare * 100)

    return (
        <Container
            className={cn(styles.objectFilters, className)}
            header={
                <h3 className={styles.title}>
                    {t('components.pages.objects.object-filters.title', 'Выдержка по фильтрам')}
                </h3>
            }
            action={
                <span className={styles.meta}>
                    {formatExposure(statistic?.exposure, t)}
                    {' · '}
                    {t('common.frames', '{{count}} кадров', { count: statistic?.frames ?? 0 })}
                </span>
            }
        >
            <ul className={styles.rows}>
                {rows.map(({ filter, exposure, frames }) => (
                    <li
                        key={filter}
                        className={styles.row}
                        style={{ '--filter-color': getFilterColor(filter) } as React.CSSProperties}
                    >
                        <b>{FILTER_LABELS[filter]}</b>
                        <span
                            className={styles.bar}
                            aria-hidden={'true'}
                        >
                            <i style={{ width: `${(exposure / max) * 100}%` }} />
                        </span>
                        <span className={styles.value}>
                            <em>{formatExposure(exposure, t)}</em>
                            {' · '}
                            {t('common.frames', '{{count}} кадров', { count: frames })}
                        </span>
                    </li>
                ))}
            </ul>

            <p className={styles.caption}>
                {t('components.pages.objects.object-filters.share', 'Доля каждого фильтра в общей выдержке')}
            </p>
            <FilterSpectrum filters={filters} />

            {/* Fills the card to the height of the chart beside it with the figures behind the bars */}
            <dl className={styles.summary}>
                <div>
                    <dt>{t('components.pages.objects.object-filters.narrowband', 'Узкополосные фильтры')}</dt>
                    <dd>
                        {`${narrowbandPercent}%`}
                        <small>
                            {narrowbandPercent >= 50
                                ? t('components.pages.objects.object-filters.narrowband-note', 'снимается при Луне')
                                : t('components.pages.objects.object-filters.broadband-note', 'нужно тёмное небо')}
                        </small>
                    </dd>
                </div>
                {summary.frameExposure !== undefined && (
                    <div>
                        <dt>{t('components.pages.objects.object-filters.frame', 'Типичный кадр')}</dt>
                        <dd>
                            {t('components.pages.objects.observing-log.seconds', '{{seconds}} с', {
                                seconds: Math.round(summary.frameExposure)
                            })}
                            <small>
                                {t('components.pages.objects.object-filters.frame-note', '{{count}} кадров всего', {
                                    count: statistic?.frames ?? 0
                                })}
                            </small>
                        </dd>
                    </div>
                )}
                {summary.perNight !== undefined && (
                    <div>
                        <dt>{t('components.pages.objects.object-filters.per-night', 'За одну ночь')}</dt>
                        <dd>
                            {formatExposure(summary.perNight, t)}
                            <small>
                                {t(
                                    'components.pages.objects.object-filters.per-night-note',
                                    'в среднем за {{count}} ночей',
                                    {
                                        count: nights ?? 0
                                    }
                                )}
                            </small>
                        </dd>
                    </div>
                )}
            </dl>
        </Container>
    )
}
