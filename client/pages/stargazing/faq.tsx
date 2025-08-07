import React from 'react'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { Trans, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'

import { SITE_LINK } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'

type FAQItem = {
    question: string
    answer: string
}

type StargazingFAQPageProps = object

const StargazingFAQPage: NextPage<StargazingFAQPageProps> = () => {
    const { t, i18n } = useTranslation()

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')

    return (
        <AppLayout>
            <NextSeo
                title={t('stargazing-faq')}
                description={t('stargazing-faq-page.description')}
                canonical={`${canonicalUrl}stargazing/faq`}
                openGraph={{
                    siteName: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('stargazing-faq')}
                currentPage={t('stargazing-faq')}
                links={[
                    {
                        link: '/stargazing',
                        text: t('stargazing')
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ marginTop: 0 }}>
                    {t('stargazing-faq-page.intro')}
                    <Link
                        href={'https://t.me/look_at_stars'}
                        style={{ marginLeft: '5px' }}
                        title={t('telegram')}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('near_space')}
                    </Link>
                    {'.'}
                </p>
            </Container>
            {(
                t('stargazing-faq-page.questions', {
                    returnObjects: true
                }) as FAQItem[]
            ).map((item: FAQItem, index: number) => (
                <div key={index}>
                    <h3 style={{ marginTop: 20, marginBottom: 5, fontSize: '18px' }}>❓{item.question}</h3>
                    <Container style={{ marginBottom: '10px' }}>
                        <Trans
                            i18nKey={`stargazing-faq-page.questions.${index}.answer`}
                            components={{
                                link1: (
                                    <a
                                        href='https://t.me/stargazing_oren'
                                        rel='nofollow noopener'
                                        target={'_blank'}
                                        title='Астро.Попутчики'
                                    />
                                ),
                                link2: (
                                    <a
                                        href='https://t.me/all_astronomers'
                                        rel='nofollow noopener'
                                        target={'_blank'}
                                        title='Астро.Чат'
                                    />
                                ),
                                link3: (
                                    <a
                                        href='https://pay.cloudtips.ru/p/6818d70d'
                                        rel='nofollow noopener'
                                        target={'_blank'}
                                        title='ДОНАТЫ'
                                    />
                                )
                            }}
                        />
                    </Container>
                </div>
            ))}

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<StargazingFAQPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default StargazingFAQPage
