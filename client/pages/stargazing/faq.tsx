import React from 'react'
import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { Container } from 'simple-react-ui-kit'

import { SITE_LINK } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'

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
                {(
                    t('stargazing-faq-page.questions', {
                        returnObjects: true
                    }) as any[]
                ).map((item: any, index: number) => (
                    <div key={index}>
                        <h3 style={{ marginTop: 10 }}>{item.question}</h3>
                        <p style={{ margin: 0 }}>{item.answer}</p>
                    </div>
                ))}
            </Container>

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
