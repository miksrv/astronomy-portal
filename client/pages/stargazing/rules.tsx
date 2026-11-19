import React from 'react'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'

import { SITE_LINK, wrapper } from '@/api'
import { ContentText, StaticInfoPageLayout } from '@/components/common'
import { StargazingGuideMore } from '@/components/pages/stargazing/stargazing-guide'
import type { ContentPageData } from '@/utils/content'
import { loadContentPage } from '@/utils/content.server'
import { initSSRLocale } from '@/utils/ssrLocale'

type StargazingRulesPageProps = Pick<ContentPageData, 'title' | 'description' | 'html'>

/** The text of the page is `client/content/stargazing-rules.<locale>.md` */
const StargazingRulesPage: NextPage<StargazingRulesPageProps> = ({ title, description, html }) => {
    const { t } = useTranslation()

    const webPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${SITE_LINK}stargazing/rules`,
        name: title,
        url: `${SITE_LINK}stargazing/rules`,
        description,
        breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: t('menu.stargazing', 'Астровыезды'),
                    item: `${SITE_LINK}stargazing`
                },
                { '@type': 'ListItem', position: 2, name: title }
            ]
        }
    }

    return (
        <StaticInfoPageLayout
            canonical={'stargazing/rules'}
            title={title}
            kicker={t('pages.stargazing.guide-kicker', 'Перед поездкой')}
            description={description}
            openGraph={{
                images: [{ url: '/photos/stargazing-1.jpeg', width: 1280, height: 853 }]
            }}
            jsonLd={{ scriptKey: 'rules-webpage', data: webPageSchema }}
            breadcrumbLinks={[
                {
                    link: '/stargazing',
                    text: t('menu.stargazing', 'Астровыезды')
                }
            ]}
        >
            <ContentText
                html={html}
                editorial
            />
            <StargazingGuideMore current={'/stargazing/rules'} />
        </StaticInfoPageLayout>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<StargazingRulesPageProps>> => {
            const { locale, translations } = await initSSRLocale(store, context)
            const { title, description, html } = loadContentPage('stargazing-rules', locale)

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

export default StargazingRulesPage
