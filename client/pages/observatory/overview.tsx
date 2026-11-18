import React from 'react'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'

import { SITE_LINK, wrapper } from '@/api'
import { ContentText, StaticInfoPageLayout } from '@/components/common'
import type { ContentPageData } from '@/utils/content'
import { loadContentPage } from '@/utils/content.server'
import { initSSRLocale } from '@/utils/ssrLocale'

type ObservatoryOverviewPageProps = Pick<ContentPageData, 'title' | 'description' | 'html'>

/**
 * The story of the observatory and its equipment: `client/content/observatory-overview.<locale>.md`.
 * Fully static, built once per deploy: the photos and objects are linked from the text.
 */
const ObservatoryOverviewPage: NextPage<ObservatoryOverviewPageProps> = ({ title, description, html }) => {
    const { t } = useTranslation()

    const techArticleSchema = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        '@id': `${SITE_LINK}observatory/overview`,
        headline: title,
        description,
        url: `${SITE_LINK}observatory/overview`,
        image: `${SITE_LINK}photos/observatory-3.jpeg`,
        author: {
            '@type': 'Organization',
            name: 'Смотри на звёзды',
            url: SITE_LINK
        },
        publisher: {
            '@type': 'Organization',
            name: 'Смотри на звёзды',
            url: SITE_LINK,
            logo: { '@type': 'ImageObject', url: `${SITE_LINK}android-chrome-192x192.png` }
        }
    }

    return (
        <StaticInfoPageLayout
            canonical={'observatory/overview'}
            title={title}
            description={description}
            openGraph={{
                images: [
                    {
                        height: 630,
                        url: '/images/og-observatory.jpg',
                        width: 1200
                    }
                ]
            }}
            jsonLd={{ scriptKey: 'observatory-overview-tech-article', data: techArticleSchema }}
            breadcrumbLinks={[
                {
                    link: '/observatory',
                    text: t('menu.observatory', 'Обсерватория')
                }
            ]}
        >
            <ContentText html={html} />
        </StaticInfoPageLayout>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<ObservatoryOverviewPageProps>> => {
            const { locale, translations } = await initSSRLocale(store, context)
            const { title, description, html } = loadContentPage('observatory-overview', locale)

            return {
                props: {
                    ...translations,
                    title,
                    description,
                    html
                }
            }
        }
)

export default ObservatoryOverviewPage
