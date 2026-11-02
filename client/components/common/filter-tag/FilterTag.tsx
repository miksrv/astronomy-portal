import React from 'react'
import { cn } from 'simple-react-ui-kit'

import { ApiModel } from '@/api'
import { getFilterColor } from '@/utils/colors'
import { FILTER_LABELS } from '@/utils/filters'

import styles from './styles.module.sass'

interface FilterTagProps {
    filter: ApiModel.FilterTypes
    /** Shown after the filter's name, e.g. "× 12" frames */
    children?: React.ReactNode
    className?: string
}

/** A filter's name on a plate tinted with the filter's colour */
export const FilterTag: React.FC<FilterTagProps> = ({ filter, children, className }) => (
    <span
        className={cn(styles.filterTag, className)}
        style={{ '--filter-color': getFilterColor(filter) } as React.CSSProperties}
    >
        {FILTER_LABELS[filter]}
        {children}
    </span>
)
