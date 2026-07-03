import React, { forwardRef } from 'react'

import { useTranslation } from 'next-i18next/pages'

import { Breadcrumbs, BreadcrumbsProps } from '@/components/ui'

import { BreadcrumbJsonLd } from '../breadcrumb-json-ld'

import '@/api/applicationSlice'

import styles from './styles.module.sass'

interface AppToolbarProps extends Pick<BreadcrumbsProps, 'currentPage' | 'links'> {
    title?: string
    children?: React.ReactNode
    /** Rendered below the breadcrumbs line, e.g. a live "last updated" indicator. */
    afterBreadcrumbs?: React.ReactNode
}

export const AppToolbar = forwardRef<HTMLDivElement, AppToolbarProps>(
    ({ title, links, currentPage, children, afterBreadcrumbs }, ref) => {
        const { t } = useTranslation()

        return (
            <>
                <BreadcrumbJsonLd
                    links={links}
                    currentPage={currentPage}
                />
                <div
                    className={styles.toolbarHeader}
                    ref={ref}
                >
                    <div className={styles.toolbarTitle}>
                        <h1>{title}</h1>
                        {(links || currentPage) && (
                            <Breadcrumbs
                                links={links}
                                currentPage={currentPage}
                                homePageTitle={t('common.look-at-the-stars', 'Смотри на звёзды')}
                            />
                        )}
                        {afterBreadcrumbs && <div className={styles.toolbarMeta}>{afterBreadcrumbs}</div>}
                    </div>
                    {children && <div className={styles.toolbarActions}>{children}</div>}
                </div>
            </>
        )
    }
)

AppToolbar.displayName = 'AppToolbar'
