import '@/api/applicationSlice'
import Breadcrumbs, { BreadcrumbLink, BreadcrumbsProps } from '@/ui/breadcrumbs'
import { useTranslation } from 'next-i18next'
import React, { forwardRef } from 'react'

import styles from './styles.module.sass'

interface AppToolbarProps
    extends Pick<BreadcrumbsProps, 'currentPage' | 'links'> {
    title?: string
    children?: React.ReactNode
    breadcrumbs?: BreadcrumbLink[]
}

const AppToolbar = forwardRef<HTMLDivElement, AppToolbarProps>(
    ({ title, links, currentPage, children }, ref) => {
        const { t } = useTranslation()

        return (
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
                            homePageTitle={t('look-at-the-stars')}
                        />
                    )}
                </div>
                {children && (
                    <div className={styles.toolbarActions}>{children}</div>
                )}
            </div>
        )
    }
)

AppToolbar.displayName = 'AppToolbar'

export default AppToolbar
