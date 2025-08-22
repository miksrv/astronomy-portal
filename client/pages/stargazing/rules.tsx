import React from 'react'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { ApiModel, setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'

const StargazingRulesPage: NextPage<object> = () => {
    const { t } = useTranslation()

    return (
        <AppLayout
            canonical={'stargazing/rules'}
            title={t('pages.stargazing-rules.title', { defaultValue: 'Правила поведения на астровыездах' })}
            description={t('pages.stargazing-rules.description')}
        >
            <AppToolbar
                title={t('stargazing-rules')}
                currentPage={t('stargazing-rules')}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', { defaultValue: 'Астровыезды' })
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ margin: 0 }}>{t('pages.stargazing-rules.welcome')}</p>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>{t('pages.stargazing-rules.prohibited-title')}</h2>
                <ul style={{ listStyle: 'decimal', marginBottom: 0 }}>
                    {(
                        t('pages.stargazing-rules.prohibited-items', {
                            returnObjects: true
                        }) as ApiModel.Object[]
                    ).map((item, index: number) => (
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
                <h2 style={{ marginTop: 0 }}>{t('pages.stargazing-rules.recommendations-title')}</h2>
                <ul style={{ marginBottom: 0 }}>
                    {(
                        t('pages.stargazing-rules.recommendations-items', {
                            returnObjects: true
                        }) as ApiModel.Object[]
                    ).map((item, index: number) => (
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
                <h2 style={{ marginTop: 0 }}>{t('pages.stargazing-rules.importance-title')}</h2>
                <p style={{ margin: 0 }}>{t('pages.stargazing-rules.importance-description')}</p>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>{t('pages.stargazing-rules.join-title')}</h2>
                <p style={{ margin: 0 }}>
                    {t('pages.stargazing-rules.join-description')}
                    <Link
                        style={{ margin: '0 5px' }}
                        href={'https://t.me/look_at_stars'}
                        title={t('telegram', { defaultValue: 'Телеграмм' })}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('pages.stargazing-rules.subscribe')}
                    </Link>
                    {t('pages.stargazing-rules.join-description')}
                </p>
            </Container>

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
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
