import React, { forwardRef } from 'react'

import { useTranslation } from 'next-i18next/pages'

import { Breadcrumbs, BreadcrumbsProps } from '@/components/ui'

import { BreadcrumbJsonLd } from '../breadcrumb-json-ld'
import { PageAction, PageActions } from '../page-actions'

import '@/api/applicationSlice'

import styles from './styles.module.sass'

interface AppToolbarProps extends Pick<BreadcrumbsProps, 'currentPage' | 'links'> {
    title?: string
    /** Right after a short title, on its line: the status of what the page is about (a job) */
    titleAside?: React.ReactNode
    /** The page's first paragraph, under the title */
    lead?: React.ReactNode
    /** The editor's actions behind "Действия ▾": the last thing on the title's line, on the right */
    actions?: PageAction[]
    /** On the title's line, on the right (under the title on phones): controls a visitor uses — never beside the lead */
    children?: React.ReactNode
    /** Rendered below the breadcrumbs line, e.g. a live "last updated" indicator. */
    afterBreadcrumbs?: React.ReactNode
}

export const AppToolbar = forwardRef<HTMLDivElement, AppToolbarProps>(
    ({ title, titleAside, lead, links, currentPage, actions, children, afterBreadcrumbs }, ref) => {
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
                        {(links || currentPage) && (
                            <div className={styles.toolbarTop}>
                                <Breadcrumbs
                                    className={styles.toolbarBreadcrumbs}
                                    links={links}
                                    currentPage={currentPage}
                                    homePageTitle={t('common.look-at-the-stars', 'Смотри на звёзды')}
                                />
                            </div>
                        )}
                        <div className={styles.toolbarTitleRow}>
                            <div className={styles.toolbarHeading}>
                                <h1>{title}</h1>
                                {titleAside && <div className={styles.toolbarAside}>{titleAside}</div>}
                            </div>
                            {children && <div className={styles.toolbarActions}>{children}</div>}
                            {!!actions?.length && (
                                <PageActions
                                    className={styles.toolbarPageActions}
                                    actions={actions}
                                />
                            )}
                        </div>
                        {afterBreadcrumbs && <div className={styles.toolbarMeta}>{afterBreadcrumbs}</div>}
                        {/* The lead runs the full width, under the title and its controls (DESIGN §4) */}
                        {lead && <p className={styles.toolbarLead}>{lead}</p>}
                    </div>
                </div>
            </>
        )
    }
)

AppToolbar.displayName = 'AppToolbar'
