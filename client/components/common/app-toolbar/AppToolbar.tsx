import React, { forwardRef } from 'react'

import Head from 'next/head'
import { useTranslation } from 'next-i18next/pages'

import { SITE_LINK } from '@/api'
import { BreadcrumbLink, Breadcrumbs, BreadcrumbsProps } from '@/components/ui'

import '@/api/applicationSlice'

import styles from './styles.module.sass'

interface AppToolbarProps extends Pick<BreadcrumbsProps, 'currentPage' | 'links'> {
    title?: string
    children?: React.ReactNode
    breadcrumbs?: BreadcrumbLink[]
}

export const AppToolbar = forwardRef<HTMLDivElement, AppToolbarProps>(
    ({ title, links, currentPage, children }, ref) => {
        const { t, i18n } = useTranslation()

        const localePrefix = i18n.language === 'en' ? 'en/' : ''
        const baseUrl = `${SITE_LINK ?? ''}${localePrefix}`

        const breadcrumbItems: Array<{ name: string; item?: string }> = [
            { name: t('common.look-at-the-stars', 'Смотри на звёзды'), item: SITE_LINK }
        ]

        if (links?.length) {
            for (const { link, text } of links) {
                breadcrumbItems.push({
                    name: text,
                    item: `${baseUrl}${link.replace(/^\//, '')}`
                })
            }
        }

        if (currentPage) {
            breadcrumbItems.push({ name: currentPage })
        }

        const breadcrumbJsonLd = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbItems.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.name,
                ...(item.item ? { item: item.item } : {})
            }))
        }

        return (
            <>
                {(links || currentPage) && (
                    <Head>
                        <script
                            type={'application/ld+json'}
                            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
                        />
                    </Head>
                )}
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
                    </div>
                    {children && <div className={styles.toolbarActions}>{children}</div>}
                </div>
            </>
        )
    }
)

AppToolbar.displayName = 'AppToolbar'
