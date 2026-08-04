import React from 'react'
import { cn } from 'simple-react-ui-kit'

import Link from 'next/link'

import styles from './styles.module.sass'

export interface BreadcrumbLink {
    link: string
    text: string
}

export interface BreadcrumbsProps {
    homePageTitle?: string
    currentPage?: string
    className?: string
    links?: BreadcrumbLink[]
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ homePageTitle, links, className, currentPage }) => {
    /** Nearest ancestor: the last breadcrumb link, or the home page if there are no links. */
    const parent: BreadcrumbLink | undefined = links?.length
        ? links[links.length - 1]
        : homePageTitle?.length
          ? { link: '/', text: homePageTitle }
          : undefined

    return (
        <nav
            aria-label={'breadcrumb'}
            className={cn(className, styles.breadcrumbs)}
        >
            <ol className={styles.fullTrail}>
                {!!homePageTitle?.length && (
                    <li>
                        <Link
                            href={'/'}
                            title={homePageTitle}
                        >
                            {homePageTitle}
                        </Link>
                    </li>
                )}
                {!!links?.length &&
                    links.map(({ link, text }) => (
                        <li key={link}>
                            <Link
                                href={link}
                                title={text}
                            >
                                {text}
                            </Link>
                        </li>
                    ))}
                {currentPage && (
                    <li
                        aria-current={'page'}
                        className={styles.currentPage}
                    >
                        {currentPage}
                    </li>
                )}
            </ol>

            {parent && (
                <Link
                    href={parent.link}
                    title={parent.text}
                    className={styles.parentLink}
                >
                    <span aria-hidden={'true'}>{'←'}</span>
                    {parent.text}
                </Link>
            )}
        </nav>
    )
}
