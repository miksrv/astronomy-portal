import React from 'react'

import Head from 'next/head'
import { useTranslation } from 'next-i18next/pages'

import { SITE_LINK } from '@/api'
import { BreadcrumbLink } from '@/components/ui'

interface BreadcrumbJsonLdProps {
    links?: BreadcrumbLink[]
    currentPage?: string
}

/**
 * Emits a schema.org BreadcrumbList as JSON-LD into <Head>.
 *
 * Use directly on indexable pages that have NO visual breadcrumbs (e.g. section
 * roots) to provide the breadcrumb rich result without rendering UI. On pages
 * with visual breadcrumbs this is rendered for you by AppToolbar.
 *
 * The home page ("Смотри на звёзды") is always prepended as the first item.
 */
export const BreadcrumbJsonLd: React.FC<BreadcrumbJsonLdProps> = ({ links, currentPage }) => {
    const { t, i18n } = useTranslation()

    if (!links?.length && !currentPage) {
        return null
    }

    const localePrefix = i18n.language === 'en' ? 'en/' : ''
    const baseUrl = `${SITE_LINK ?? ''}${localePrefix}`

    const breadcrumbItems: Array<{ name: string; item?: string }> = [
        { name: t('common.look-at-the-stars', 'Смотри на звёзды'), item: baseUrl }
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
        <Head>
            <script
                type={'application/ld+json'}
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
        </Head>
    )
}

BreadcrumbJsonLd.displayName = 'BreadcrumbJsonLd'
