import React from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

export interface SegmentedOption<T extends string | number> {
    key: T
    label: React.ReactNode
    /** A secondary number after the label, e.g. how many items the option leaves */
    count?: number
}

interface SegmentedControlProps<T extends string | number> {
    options: Array<SegmentedOption<T>>
    value: T
    /** The kit's control heights, as `Button`'s `size`: small 28px, medium 36px (default), large 44px */
    size?: 'small' | 'medium' | 'large'
    'aria-label': string
    className?: string
    onChange?: (value: T) => void
}

/**
 * One choice out of a few, shown all at once: a row of toggle buttons on a plate, the chosen
 * one raised. For filters and views of the same content (statuses, years), not for navigation.
 */
export const SegmentedControl = <T extends string | number>({
    options,
    value,
    size = 'medium',
    className,
    onChange,
    ...props
}: SegmentedControlProps<T>) => (
    <div
        role={'group'}
        aria-label={props['aria-label']}
        className={cn(styles.segmentedControl, styles[size], className)}
    >
        {options.map((option) => (
            <Button
                key={option.key}
                unstyled={true}
                className={styles.option}
                aria-pressed={option.key === value}
                onClick={() => onChange?.(option.key)}
            >
                {option.label}
                {option.count !== undefined && <span className={styles.count}>{option.count}</span>}
            </Button>
        ))}
    </div>
)
