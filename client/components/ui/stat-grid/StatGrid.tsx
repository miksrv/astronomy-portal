import React from 'react'
import { cn, Skeleton } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

export interface StatItem {
    value?: React.ReactNode
    /** Small text right after the value: a unit or "of N" */
    unit?: React.ReactNode
    label: React.ReactNode
}

interface StatGridProps {
    items: StatItem[]
    /** `plate` for a nested grid inside a card (surface-2, no ring) */
    variant?: 'card' | 'plate'
    loading?: boolean
    className?: string
    'aria-label'?: string
}

/**
 * A row of numbers that are the point of their block (catalog totals, KPIs of an object,
 * a year of the telescope's work): the value big, its label under it. Four columns on wide
 * screens, two on phones.
 */
export const StatGrid: React.FC<StatGridProps> = ({ items, variant = 'card', loading, className, ...props }) => (
    <dl
        className={cn(styles.statGrid, styles[variant], className)}
        aria-label={props['aria-label']}
    >
        {items.map((item, i) => (
            <div
                key={i}
                className={styles.stat}
            >
                <dt className={styles.label}>{item.label}</dt>
                <dd className={styles.value}>
                    {loading ? (
                        <Skeleton className={styles.skeleton} />
                    ) : (
                        <>
                            {item.value ?? '—'}
                            {item.unit && <small>{item.unit}</small>}
                        </>
                    )}
                </dd>
            </div>
        ))}
    </dl>
)
