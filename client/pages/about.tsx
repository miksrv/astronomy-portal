import React from 'react'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'
import { JsonLdScript } from 'next-seo'

import { SITE_LINK, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar, ContentText } from '@/components/common'
import { ProjectTeam } from '@/components/pages/about'
import type { ContentPageData } from '@/utils/content'
import { loadContentPage, sectionsHtml } from '@/utils/content.server'
import { initSSRLocale } from '@/utils/ssrLocale'

import styles from './about.module.sass'

interface AboutPageProps extends Pick<ContentPageData, 'title' | 'description'> {
    /** The lead, the story and the first section (the team), as HTML: the team carousel follows */
    textTop: string
    /** The other sections, as HTML: the thanks to the first donators close the last one */
    textBottom: string
}

/**
 * The text of the page is `client/content/about.<locale>.md`, the thanks to the first donators of
 * the observatory included. The team carousel sits between its first `##` section and the rest
 */
const AboutPage: NextPage<AboutPageProps> = ({ title, description, textTop, textBottom }) => {
    const { t } = useTranslation()

    const aboutPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        '@id': `${SITE_LINK}about`,
        name: 'О проекте «Смотри на звёзды»',
        url: `${SITE_LINK}about`,
        description: 'Любительская астрономическая обсерватория, астровыезды и астрофотографии в Оренбурге',
        author: {
            '@type': 'Person',
            name: 'Миша Топчило',
            url: 'https://miksoft.pro'
        }
    }

    return (
        <AppLayout
            canonical={'about'}
            noBrandSuffix={true}
            title={t('pages.about.seo-title', 'О проекте «Смотри на звёзды»: команда и обсерватория')}
            description={description}
            openGraph={{
                images: [
                    {
                        height: 853,
                        url: '/photos/stargazing-2.jpeg',
                        width: 1280
                    }
                ]
            }}
        >
            <JsonLdScript
                scriptKey={'about-page'}
                data={aboutPageSchema}
            />

            <AppToolbar
                title={title}
                currentPage={title}
            />

            <ContentText html={textTop} />

            <ProjectTeam />

            <ContentText
                html={textBottom}
                className={styles.text}
            />

            <AppFooter />
        </AppLayout>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<AboutPageProps>> => {
            const { locale, translations } = await initSSRLocale(store, context, ['translation', 'about'])
            const { title, description, intro, sections } = loadContentPage('about', locale)

            return {
                props: {
                    ...translations,
                    title,
                    description,
                    textTop: intro + sectionsHtml(sections.slice(0, 1)),
                    textBottom: sectionsHtml(sections.slice(1))
                }
            }
        }
)

export default AboutPage
