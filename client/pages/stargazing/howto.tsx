import React from 'react'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'

import { SITE_LINK, wrapper } from '@/api'
import { ContentText, StaticInfoPageLayout } from '@/components/common'
import { StargazingGuideMore } from '@/components/pages/stargazing/stargazing-guide'
import type { ContentPageData } from '@/utils/content'
import { loadContentPage } from '@/utils/content.server'
import { initSSRLocale } from '@/utils/ssrLocale'

type StargazingHowToPageProps = Pick<ContentPageData, 'title' | 'description' | 'html' | 'steps'>

/**
 * The text of the page is `client/content/stargazing-howto.<locale>.md`; the steps of its plan
 * (the list items opening with a `###`) are also the steps of the HowTo structured data
 */
const StargazingHowToPage: NextPage<StargazingHowToPageProps> = ({ title, description, html, steps }) => {
    const { t } = useTranslation()

    const howToSchema = {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: title,
        description,
        url: `${SITE_LINK}stargazing/howto`,
        step: steps.map((step, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: step.title,
            text: step.text
        }))
    }

    return (
        <StaticInfoPageLayout
            canonical={'stargazing/howto'}
            title={title}
            kicker={t('pages.stargazing.guide-kicker', 'Перед поездкой')}
            description={description}
            openGraph={{
                images: [
                    {
                        height: 1467,
                        url: '/photos/stargazing-9.jpeg',
                        width: 2200
                    }
                ]
            }}
            jsonLd={{ scriptKey: 'howto-schema', data: howToSchema }}
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
            <StargazingGuideMore current={'/stargazing/howto'} />
        </StaticInfoPageLayout>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<StargazingHowToPageProps>> => {
            const { locale, translations } = await initSSRLocale(store, context)
            const { title, description, html, steps } = loadContentPage('stargazing-howto', locale)

            return {
                props: {
                    ...translations,
                    title,
                    description,
                    html,
                    steps
                }
            }
        }
)

export default StargazingHowToPage
