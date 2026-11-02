import React from 'react'
import { cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

export type StatusTone = 'positive' | 'accent' | 'warning' | 'neutral'

interface StatusBadgeProps {
    tone: StatusTone
    /** A dot before the text, for live states ("visible tonight") */
    dot?: boolean
    children: React.ReactNode
    className?: string
}

/** A short status on a tinted pill: green is good, periwinkle in progress, orange a warning */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ tone, dot, children, className }) => (
    <span className={cn(styles.statusBadge, styles[tone], className)}>
        {dot && (
            <span
                className={styles.dot}
                aria-hidden={'true'}
            />
        )}
        {children}
    </span>
)
