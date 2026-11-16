import React from 'react'
import { cn } from 'simple-react-ui-kit'

import { ApiModel } from '@/api'
import { getFilterColor } from '@/utils/colors'
import { FILTER_LABELS } from '@/utils/filters'

import styles from './styles.module.sass'

interface FilterTagProps {
    filter: ApiModel.FilterTypes
    /** The value after the filter's name — "× 12" frames, "20 × 300 с", "2 ч 10 мин" */
    children?: React.ReactNode
    className?: string
}

/** A filter's name on a plate tinted with the filter's colour, and its value */
export const FilterTag: React.FC<FilterTagProps> = ({ filter, children, className }) => (
    <span
        className={cn(styles.filterTag, className)}
        style={{ '--filter-color': getFilterColor(filter) } as React.CSSProperties}
    >
        {FILTER_LABELS[filter]}
        {children != null && <span className={styles.value}>{children}</span>}
    </span>
)

interface FilterTagListProps {
    /** The tags (`FilterTag`), one per item */
    children: React.ReactNode
    className?: string
    'aria-label'?: string
}

/** Filter tags in a row that wraps, the same 4px apart everywhere (photos, objects, jobs) */
export const FilterTagList: React.FC<FilterTagListProps> = ({ children, className, ...rest }) => (
    <ul
        className={cn(styles.list, className)}
        {...rest}
    >
        {React.Children.map(children, (child) => (child ? <li>{child}</li> : null))}
    </ul>
)
