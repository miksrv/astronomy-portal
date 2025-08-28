import React from 'react'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { Trans, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'

type FAQItem = {
    question: string
    answer: string
}

const StargazingFAQPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const title = t('pages.stargazing-faq.title', { defaultValue: 'Часто задаваемые вопросы' })

    return (
        <AppLayout
            canonical={'stargazing/faq'}
            title={title}
            description={t('pages.stargazing-faq.description', {
                defaultValue:
                    'Узнайте ответы на частые вопросы об астровыездах: регистрация, что взять с собой, стоимость, длительность и как добраться. Готовьтесь к ночи под звездами с комфортом!'
            })}
        >
            <AppToolbar
                title={title}
                currentPage={title}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', { defaultValue: 'Астровыезды' })
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ marginTop: 0 }}>
                    {t('pages.stargazing-faq.description', {
                        defaultValue:
                            'Узнайте ответы на частые вопросы об астровыездах: регистрация, что взять с собой, стоимость, длительность и как добраться. Готовьтесь к ночи под звездами с комфортом!'
                    })}
                    <Link
                        href={'https://t.me/look_at_stars'}
                        style={{ marginLeft: '5px' }}
                        title={t('telegram', { defaultValue: 'Телеграм' })}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('common.look-at-the-stars', { defaultValue: 'Смотри на звёзды' })}
                    </Link>
                    {'.'}
                </p>
            </Container>
            {(
                t('pages.stargazing-faq.questions', {
                    returnObjects: true
                }) as FAQItem[]
            ).map((item: FAQItem, index: number) => (
                <div key={index}>
                    <h3 style={{ marginTop: 20, marginBottom: 5, fontSize: '18px' }}>❓{item.question}</h3>
                    <Container style={{ marginBottom: '10px' }}>
                        <Trans
                            i18nKey={`pages.stargazing-faq.questions.${index}.answer`}
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

export default StargazingFAQPage
