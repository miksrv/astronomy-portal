import React, { useState } from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'

import { wrapper } from '@/api'
import { StaticInfoPageLayout, useContentLinks } from '@/components/common'
import { StargazingGuideMore } from '@/components/pages/stargazing/stargazing-guide'
import type { ContentPageData } from '@/utils/content'
import { loadContentPage } from '@/utils/content.server'
import { initSSRLocale } from '@/utils/ssrLocale'

import styles from './faq.module.sass'

type StargazingFAQPageProps = Pick<ContentPageData, 'title' | 'description' | 'intro' | 'sections'>

/**
 * The text of the page is `client/content/stargazing-faq.<locale>.md`: every `##` is a question,
 * its text the answer. Every answer is in the HTML (a closed one is only `inert`), so search
 * engines read them all; the FAQPage structured data is made of the same text.
 */
const StargazingFAQPage: NextPage<StargazingFAQPageProps> = ({ title, description, intro, sections }) => {
    const { t } = useTranslation()
    const handleLinks = useContentLinks()
    // One answer open at a time: opening a question closes the previous one
    const [openItem, setOpenItem] = useState<number | null>(0)

    const toggleItem = (idx: number) => setOpenItem((prev) => (prev === idx ? null : idx))

    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: sections.map((section) => ({
            '@type': 'Question',
            name: section.title,
            acceptedAnswer: {
                '@type': 'Answer',
                text: section.text
            }
        }))
    }

    return (
        <StaticInfoPageLayout
            canonical={'stargazing/faq'}
            title={title}
            kicker={t('pages.stargazing.guide-kicker', 'Перед поездкой')}
            description={description}
            openGraph={{
                images: [{ url: '/photos/stargazing-1.jpeg', width: 1280, height: 853 }]
            }}
            jsonLd={{ scriptKey: 'faq-schema', data: faqJsonLd }}
            breadcrumbLinks={[
                {
                    link: '/stargazing',
                    text: t('menu.stargazing', 'Астровыезды')
                }
            ]}
        >
            {/* Delegated clicks: the targets are the native links of the text (`useContentLinks`) */}
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div
                className={styles.intro}
                dangerouslySetInnerHTML={{ __html: intro }}
                onClick={handleLinks}
            />

            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div
                className={styles.faqList}
                onClick={handleLinks}
            >
                {sections.map((section, idx) => {
                    const isOpen = openItem === idx

                    return (
                        <div
                            key={section.id}
                            id={section.id}
                            className={cn(styles.faqItem, isOpen && styles.open)}
                        >
                            <button
                                type={'button'}
                                className={styles.faqQuestion}
                                onClick={() => toggleItem(idx)}
                                id={`faq-question-${idx}`}
                                aria-expanded={isOpen}
                                aria-controls={`faq-answer-${idx}`}
                            >
                                <span
                                    className={styles.faqIndex}
                                    aria-hidden={'true'}
                                >
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                                <span className={styles.faqTitle}>{section.title}</span>
                                <Icon
                                    name={'KeyboardDown'}
                                    className={styles.chevron}
                                    aria-hidden
                                />
                            </button>

                            <div
                                id={`faq-answer-${idx}`}
                                className={styles.faqAnswer}
                                role={'region'}
                                aria-labelledby={`faq-question-${idx}`}
                                // Collapsed answers stay out of the tab order and the a11y tree
                                inert={!isOpen}
                            >
                                <div>
                                    <div
                                        className={styles.faqAnswerContent}
                                        dangerouslySetInnerHTML={{ __html: section.html }}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            <StargazingGuideMore current={'/stargazing/faq'} />
        </StaticInfoPageLayout>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<StargazingFAQPageProps>> => {
            const { locale, translations } = await initSSRLocale(store, context, ['translation', 'stargazing'])
            const { title, description, intro, sections } = loadContentPage('stargazing-faq', locale)

            return {
                props: {
                    ...translations,
                    title,
                    description,
                    intro,
                    sections
                }
            }
        }
)

export default StargazingFAQPage
