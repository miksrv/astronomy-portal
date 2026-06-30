import React from 'react'
import { getCookie } from 'cookies-next'
import { Button, Icon } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, ApiModel, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, BreadcrumbJsonLd, PrevNextNav } from '@/components/common'
import {
    EventImportant,
    EventProgram,
    EventsList,
    EventUpcoming,
    InfoCards,
    ReviewsWidget
} from '@/components/pages/stargazing'
import type { InfoCardItem } from '@/components/pages/stargazing/info-cards'
import { getSecondsUntilUTCDate } from '@/utils/dates'

import styles from './index.module.sass'

interface StargazingPageProps {
    upcomingData: ApiModel.Event | null
    pastEvents: ApiModel.Event[]
}

const StargazingPage: NextPage<StargazingPageProps> = ({ upcomingData, pastEvents }) => {
    const { t } = useTranslation()

    const title = t('pages.stargazing.title', 'Астровыезды')

    const infoCards: InfoCardItem[] = [
        {
            href: '/stargazing/rules',
            icon: 'ReportError',
            title: t('pages.stargazing.rules_link', 'Правила поведения на астровыездах'),
            description: t('pages.stargazing.rules_card_desc', 'Что нельзя делать и как уважать других')
        },
        {
            href: '/stargazing/howto',
            icon: 'StarFilled',
            title: t('pages.stargazing.howto_link', 'Как проходят астровыезды'),
            description: t('pages.stargazing.howto_card_desc', 'Программа вечера, телескопы и лекции')
        },
        {
            href: '/stargazing/where',
            icon: 'Map',
            title: t('pages.stargazing.where_link', 'Где посмотреть в телескоп'),
            description: t('pages.stargazing.where_card_desc', 'Место проведения в Оренбургском районе')
        },
        {
            href: '/stargazing/faq',
            icon: 'Compass',
            title: t('pages.stargazing.faq_link', 'Часто задаваемые вопросы'),
            description: t('pages.stargazing.faq_card_desc', 'Ответы на популярные вопросы участников')
        }
    ]

    return (
        <AppLayout
            canonical={'stargazing'}
            title={title}
            description={t(
                'pages.stargazing.description',
                'Астровыезд в Оренбурге - увлекательные поездки за город, где телескопы открывают космические горизонты. Вечера научных открытий, лекций и живого общения с единомышленниками. Узнайте правила поведения и подготовьтесь к наблюдению за звёздами.'
            )}
            openGraph={{
                images: [
                    {
                        height: 853,
                        url: '/photos/stargazing-1.jpeg',
                        width: 1280
                    }
                ]
            }}
        >
            <BreadcrumbJsonLd currentPage={title} />

            <div
                className={styles.pageBackground}
                aria-hidden={'true'}
            />

            <div className={styles.hero}>
                <p className={styles.heroLabel}>
                    {t('pages.stargazing.hero-label', 'Оренбург · Наблюдение за звёздами')}
                </p>

                <h1 className={styles.heroTitle}>
                    <span>{t('pages.stargazing.hero-title-line1', 'АСТРОВЫЕЗДЫ')}</span>
                </h1>

                <p className={styles.heroSubtitle}>
                    {t(
                        'pages.stargazing.text',
                        'Представьте: ночное небо без городских огней, тысячи звёзд над головой и кольца Сатурна в окуляре телескопа. Наши астровыезды за город - это не просто наблюдения, это вечера, которые меняют взгляд на мир. Присоединяйтесь, чтобы увидеть Вселенную своими глазами!'
                    )}
                </p>

                <div className={styles.heroActions}>
                    <Button
                        mode={'primary'}
                        label={t('pages.stargazing.hero-cta-events', 'Ближайший выезд')}
                        link={'#upcoming'}
                    />

                    <Link
                        href={'https://t.me/look_at_stars'}
                        className={styles.telegramCta}
                        title={t('pages.stargazing.telegram', 'Телеграм')}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        <Icon name={'Telegram'} />
                        {t('pages.stargazing.hero-cta-telegram', 'Подписаться на Telegram')}
                    </Link>
                </div>
            </div>

            <InfoCards items={infoCards} />

            <div id={'upcoming'}>
                <EventUpcoming event={upcomingData || undefined} />
            </div>

            <h2>{t('pages.stargazing.program-title', 'Как проходит вечер')}</h2>

            <EventProgram />

            <EventImportant />

            <ReviewsWidget />

            {pastEvents.length > 0 && (
                <>
                    <h2>{t('pages.stargazing.past-events', 'Прошедшие астровыезды')}</h2>

                    <EventsList events={pastEvents} />
                </>
            )}

            <PrevNextNav
                next={{
                    href: '/stargazing/history',
                    title: t('pages.stargazing.archive-link', 'Все прошлые астровыезды')
                }}
            />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<StargazingPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

            if (token) {
                store.dispatch(setSSRToken(token))
            }

            const { data: upcomingData } = await store.dispatch(API.endpoints?.eventGetUpcoming.initiate())

            const { data: eventsData } = await store.dispatch(API.endpoints?.eventGetList.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            // Past events: already happened, most recent first
            const pastEvents = (eventsData?.items || [])
                .filter((event) => (getSecondsUntilUTCDate(event.date?.date) ?? 0) < 0)
                .sort((a, b) => (a.date?.date && b.date?.date ? b.date.date.localeCompare(a.date.date) : 0))

            return {
                props: {
                    ...translations,
                    upcomingData: upcomingData || null,
                    pastEvents: pastEvents.slice(0, 3)
                }
            }
        }
)

export default StargazingPage
