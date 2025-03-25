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

type StargazingRulesPageProps = object

const StargazingRulesPage: NextPage<StargazingRulesPageProps> = () => {
    const { t, i18n } = useTranslation()

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')

    return (
        <AppLayout>
            <NextSeo
                title={t('stargazing-rules')}
                description={t('stargazing-rules-page.description')}
                canonical={`${canonicalUrl}stargazing/rules`}
                openGraph={{
                    siteName: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('stargazing-rules')}
                currentPage={t('stargazing-rules')}
                links={[
                    {
                        link: '/stargazing',
                        text: t('stargazing')
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ margin: 0 }}>{t('stargazing-rules-page.welcome')}</p>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>{t('stargazing-rules-page.prohibited-title')}</h2>
                <ul style={{ listStyle: 'decimal', marginBottom: 0 }}>
                    {(
                        t('stargazing-rules-page.prohibited-items', {
                            returnObjects: true
                        }) as any[]
                    ).map((item: any, index: number) => (
                        <li
                            key={index}
                            style={{ marginBottom: '10px' }}
                        >
                            <h3 style={{ margin: 0 }}>{item.title}</h3>
                            <p style={{ margin: 0 }}>{item.description}</p>
                        </li>
                    ))}
                </ul>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>{t('stargazing-rules-page.recommendations-title')}</h2>
                <ul style={{ marginBottom: 0 }}>
                    {(
                        t('stargazing-rules-page.recommendations-items', {
                            returnObjects: true
                        }) as any[]
                    ).map((item: any, index: number) => (
                        <li
                            key={index}
                            style={{ marginBottom: '10px' }}
                        >
                            <h3 style={{ margin: 0 }}>{item.title}</h3>
                            <p style={{ margin: 0 }}>{item.description}</p>
                        </li>
                    ))}
                </ul>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>{t('stargazing-rules-page.importance-title')}</h2>
                <p style={{ margin: 0 }}>{t('stargazing-rules-page.importance-description')}</p>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>{t('stargazing-rules-page.join-title')}</h2>
                <p style={{ margin: 0 }}>
                    {t('stargazing-rules-page.join-description')}
                    <Link
                        style={{ margin: '0 5px' }}
                        href={'https://t.me/look_at_stars'}
                        title={t('telegram')}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('stargazing-rules-page.subscribe')}
                    </Link>
                    {t('stargazing-rules-page.join-description')}
                </p>
            </Container>

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<StargazingRulesPageProps>> => {
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

export default StargazingRulesPage
