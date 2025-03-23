import React from 'react'
import Link from 'next/link'
import { cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

export type BreadcrumbLink = {
    link: string
    text: string
}

export interface BreadcrumbsProps {
    homePageTitle?: string
    currentPage?: string
    className?: string
    links?: BreadcrumbLink[]
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ homePageTitle, links, className, currentPage }) => (
    <ul
        aria-label={'breadcrumb'}
        className={cn(className, styles.breadcrumbs)}
    >
        {!!homePageTitle?.length && (
            <li>
                <Link
                    color={'inherit'}
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
                        color={'inherit'}
                        title={text}
                    >
                        {text}
                    </Link>
                </li>
            ))}
        {currentPage && <li className={styles.currentPage}>{currentPage}</li>}
    </ul>
)

export default Breadcrumbs
