import React from 'react'
import { cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface FactListProps {
    /**
     * `columns` — the labels in a column of their own, every value starting at the same place (a
     * page section, a card's main facts); `split` — the label on the left, the value pushed to
     * the right (a narrow side card)
     */
    layout?: 'columns' | 'split'
    /** `Fact` items */
    children: React.ReactNode
    className?: string
}

/**
 * Facts of one thing as label → value pairs (a `dl`): the photo's capture and equipment, the
 * object card, a telescope job. One look everywhere: the label in the secondary colour, the value
 * in the primary one, the rows `--space-2` apart, no rules between them.
 */
export const FactList: React.FC<FactListProps> = ({ layout = 'columns', children, className }) => (
    <dl className={cn(styles.factList, styles[layout], className)}>{children}</dl>
)

interface FactProps {
    label: React.ReactNode
    children: React.ReactNode
    /** A hint on hover (e.g. the equipment's specifications) */
    title?: string
    className?: string
}

/** One label → value pair of a `FactList` */
export const Fact: React.FC<FactProps> = ({ label, children, title, className }) => (
    <div
        className={cn(styles.fact, className)}
        title={title}
    >
        <dt>{label}</dt>
        <dd>{children}</dd>
    </div>
)
