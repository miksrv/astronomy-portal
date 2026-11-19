import React from 'react'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'

import { SITE_LINK, wrapper } from '@/api'
import { ContentText, StaticInfoPageLayout } from '@/components/common'
import type { ContentPageData } from '@/utils/content'
import { loadContentPage } from '@/utils/content.server'
import { initSSRLocale } from '@/utils/ssrLocale'

type PrivacyPolicyPageProps = Pick<ContentPageData, 'title' | 'description' | 'html'>

/** The text of the page is `client/content/privacy.<locale>.md` */
const PrivacyPolicyPage: NextPage<PrivacyPolicyPageProps> = ({ title, description, html }) => {
    const webPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${SITE_LINK}privacy`,
        name: title,
        url: `${SITE_LINK}privacy`,
        description,
        breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE_LINK },
                { '@type': 'ListItem', position: 2, name: title }
            ]
        }
    }

    return (
        <StaticInfoPageLayout
            canonical={'privacy'}
            title={title}
            description={description}
            jsonLd={{ scriptKey: 'privacy-webpage', data: webPageSchema }}
        >
            <ContentText html={html} />
        </StaticInfoPageLayout>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<PrivacyPolicyPageProps>> => {
            const { locale, translations } = await initSSRLocale(store, context)
            const { title, description, html } = loadContentPage('privacy', locale)

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

export default PrivacyPolicyPage
