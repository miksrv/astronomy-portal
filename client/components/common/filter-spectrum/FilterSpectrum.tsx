import React from 'react'
import { cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { getFilterColor } from '@/utils/colors'
import { formatExposure } from '@/utils/dates'
import { FILTER_LABELS, getFilterExposures } from '@/utils/filters'

import styles from './styles.module.sass'

interface FilterSpectrumProps {
    filters?: ApiModel.Filters
    className?: string
}

/**
 * The share of every filter in the total exposure as one thin segmented bar, in the filters'
 * own colours. Reads as "what light this target was shot in" at a glance.
 */
export const FilterSpectrum: React.FC<FilterSpectrumProps> = ({ filters, className }) => {
    const { t } = useTranslation()
    const parts = getFilterExposures(filters)

    const description = parts
        .map(({ filter, exposure }) => `${FILTER_LABELS[filter]} ${formatExposure(exposure, t)}`)
        .join(', ')

    return (
        <div
            className={cn(styles.filterSpectrum, className)}
            role={parts.length ? 'img' : undefined}
            aria-label={
                parts.length
                    ? t('components.common.filter-spectrum.label', 'Выдержка по фильтрам: {{filters}}', {
                          filters: description
                      })
                    : undefined
            }
        >
            {parts.map(({ filter, exposure }) => (
                <i
                    key={filter}
                    title={`${FILTER_LABELS[filter]}: ${formatExposure(exposure, t)}`}
                    style={{ flexGrow: exposure, background: getFilterColor(filter) }}
                />
            ))}
        </div>
    )
}
