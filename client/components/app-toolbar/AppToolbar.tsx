import '@/api/applicationSlice'
import Breadcrumbs, { BreadcrumbLink, BreadcrumbsProps } from '@/ui/breadcrumbs'
import { useTranslation } from 'next-i18next'
import React from 'react'

import styles from './styles.module.sass'

interface AppHeaderProps
    extends Pick<BreadcrumbsProps, 'currentPage' | 'links'> {
    title?: string
    children?: React.ReactNode
    breadcrumbs?: BreadcrumbLink[]
}

const AppToolbar: React.FC<AppHeaderProps> = ({
    title,
    links,
    currentPage,
    children
}) => {
    const { t } = useTranslation()

    return (
        <div className={styles.toolbarHeader}>
            <div className={styles.toolbarTitle}>
                <h1>{title}</h1>
                {(links || currentPage) && (
                    <Breadcrumbs
                        links={links}
                        currentPage={currentPage}
                        homePageTitle={t('amateur-astronomy')}
                    />
                )}
            </div>
            {children && (
                <div className={styles.toolbarActions}>{children}</div>
            )}
        </div>
    )
}

export default AppToolbar
