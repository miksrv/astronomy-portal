import React from 'react'
import { cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface LandingSectionProps {
    id?: string
    /** The label over the title (overline with a brand rule) */
    kicker?: string
    /** The title; `accent` is appended to it in the brand colour */
    title: string
    accent?: string
    /** One or two sentences under the title */
    lead?: React.ReactNode
    /** On the title's line, on the right: "Смотреть все" and the like */
    aside?: React.ReactNode
    /** `h1` for a page whose first section is its title */
    as?: 'h1' | 'h2'
    className?: string
    children?: React.ReactNode
}

/**
 * A section of a landing page (home, /stargazing): kicker → big title with one accented phrase →
 * lead → content, with the landing rhythm around it (DESIGN.md → Landing pages)
 */
export const LandingSection: React.FC<LandingSectionProps> = ({
    id,
    kicker,
    title,
    accent,
    lead,
    aside,
    as: Heading = 'h2',
    className,
    children
}) => (
    <section
        id={id}
        className={cn(styles.section, className)}
    >
        <header className={styles.header}>
            <div className={styles.headerText}>
                {kicker && <p className={styles.kicker}>{kicker}</p>}
                <Heading className={styles.title}>
                    {title}
                    {accent && (
                        <>
                            {' '}
                            <em>{accent}</em>
                        </>
                    )}
                </Heading>
                {lead && <p className={styles.lead}>{lead}</p>}
            </div>
            {aside && <div className={styles.aside}>{aside}</div>}
        </header>

        {children && <div className={styles.content}>{children}</div>}
    </section>
)
