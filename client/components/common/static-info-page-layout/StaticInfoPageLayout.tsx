import React from 'react'

import { JsonLdScript } from 'next-seo'

import { BreadcrumbLink } from '@/components/ui'

import { AppFooter } from '../app-footer'
import { AppLayout, AppLayoutProps } from '../app-layout'
import { AppToolbar } from '../app-toolbar'

interface StaticInfoPageLayoutProps extends Omit<AppLayoutProps, 'children' | 'title'> {
    title: string
    /** Rendered via next-seo's JsonLdScript, keyed by scriptKey. Omit for pages with no structured data. */
    jsonLd?: {
        scriptKey: string
        data: object
    }
    /** Breadcrumb trail back to a parent section, e.g. a link back to /stargazing. */
    breadcrumbLinks?: BreadcrumbLink[]
    children: React.ReactNode
}

/**
 * Shared shell for static/informational pages (FAQ, how-to, rules, privacy, ...):
 * AppLayout + optional JSON-LD + AppToolbar breadcrumb + AppFooter. Keeps the SEO/
 * navigation boilerplate in one place so each page only supplies its own content.
 */
export const StaticInfoPageLayout: React.FC<StaticInfoPageLayoutProps> = ({
    title,
    jsonLd,
    breadcrumbLinks,
    children,
    ...layoutProps
}) => (
    <AppLayout
        title={title}
        {...layoutProps}
    >
        {jsonLd && (
            <JsonLdScript
                scriptKey={jsonLd.scriptKey}
                data={jsonLd.data}
            />
        )}

        <AppToolbar
            title={title}
            currentPage={title}
            links={breadcrumbLinks}
        />

        {children}

        <AppFooter />
    </AppLayout>
)
