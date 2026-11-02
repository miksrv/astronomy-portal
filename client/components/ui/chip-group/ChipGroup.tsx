import React from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

export interface ChipOption<T extends string | number> {
    key: T
    label: React.ReactNode
    count?: number
}

interface ChipGroupProps<T extends string | number> {
    options: Array<ChipOption<T>>
    /** The pressed chip; `undefined` presses none */
    value?: T
    'aria-label': string
    className?: string
    onChange?: (value: T) => void
}

/**
 * A row of pill-shaped toggles for a filter with many values (categories). The row scrolls
 * sideways on narrow screens instead of wrapping into a tall block.
 */
export const ChipGroup = <T extends string | number>({
    options,
    value,
    className,
    onChange,
    ...props
}: ChipGroupProps<T>) => (
    <div
        role={'group'}
        aria-label={props['aria-label']}
        className={cn(styles.chipGroup, className)}
    >
        {options.map((option) => (
            <Button
                key={option.key}
                unstyled={true}
                className={styles.chip}
                aria-pressed={option.key === value}
                onClick={() => onChange?.(option.key)}
            >
                {option.label}
                {option.count !== undefined && <span className={styles.count}>{option.count}</span>}
            </Button>
        ))}
    </div>
)
