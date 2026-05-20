import React from 'react'
import { Icon } from 'simple-react-ui-kit'

import Link from 'next/link'

import styles from './styles.module.sass'

interface NavLink {
    href: string
    title: string
    subtitle?: string
}

interface PrevNextNavProps {
    prev?: NavLink | null
    next?: NavLink | null
}

export const PrevNextNav: React.FC<PrevNextNavProps> = ({ prev, next }) => {
    if (!prev && !next) {
        return null
    }

    return (
        <nav className={styles.nav}>
            {prev && (
                <Link
                    href={prev.href}
                    title={prev.title}
                    className={styles.link}
                >
                    <Icon
                        name={'KeyboardLeft'}
                        className={styles.icon}
                    />
                    <div className={styles.linkBody}>
                        {prev.subtitle && <div className={styles.subtitle}>{prev.subtitle}</div>}
                        <div>{prev.title}</div>
                    </div>
                </Link>
            )}

            {next && (
                <Link
                    href={next.href}
                    title={next.title}
                    className={styles.link}
                >
                    <div className={styles.linkBody}>
                        {next.subtitle && <div className={styles.subtitle}>{next.subtitle}</div>}
                        <div>{next.title}</div>
                    </div>
                    <Icon
                        name={'KeyboardRight'}
                        className={styles.icon}
                    />
                </Link>
            )}
        </nav>
    )
}
