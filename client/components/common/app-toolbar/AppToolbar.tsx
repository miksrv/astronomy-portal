import React, { forwardRef } from 'react'

import { useTranslation } from 'next-i18next/pages'

import { Breadcrumbs, BreadcrumbsProps } from '@/components/ui'

import { BreadcrumbJsonLd } from '../breadcrumb-json-ld'
import { PageAction, PageActions } from '../page-actions'

import '@/api/applicationSlice'

import styles from './styles.module.sass'

interface AppToolbarProps extends Pick<BreadcrumbsProps, 'currentPage' | 'links'> {
    title?: string
    /** The page's first paragraph, under the title */
    lead?: React.ReactNode
    /** Rendered on the right, on the line of the breadcrumbs: the editor's actions behind "⋯" */
    actions?: PageAction[]
    /** Rendered on the right of the title (under it on phones): controls a visitor uses */
    children?: React.ReactNode
    /** Rendered below the breadcrumbs line, e.g. a live "last updated" indicator. */
    afterBreadcrumbs?: React.ReactNode
}

export const AppToolbar = forwardRef<HTMLDivElement, AppToolbarProps>(
    ({ title, lead, links, currentPage, actions, children, afterBreadcrumbs }, ref) => {
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
                        {(links || currentPage || !!actions?.length) && (
                            <div className={styles.toolbarTop}>
                                {(links || currentPage) && (
                                    <Breadcrumbs
                                        links={links}
                                        currentPage={currentPage}
                                        homePageTitle={t('common.look-at-the-stars', 'Смотри на звёзды')}
                                    />
                                )}
                                {!!actions?.length && (
                                    <PageActions
                                        className={styles.toolbarPageActions}
                                        actions={actions}
                                    />
                                )}
                            </div>
                        )}
                        <h1>{title}</h1>
                        {afterBreadcrumbs && <div className={styles.toolbarMeta}>{afterBreadcrumbs}</div>}
                        {lead && <p className={styles.toolbarLead}>{lead}</p>}
                    </div>
                    {children && <div className={styles.toolbarActions}>{children}</div>}
                </div>
            </>
        )
    }
)

AppToolbar.displayName = 'AppToolbar'
