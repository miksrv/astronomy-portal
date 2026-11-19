import React from 'react'
import { getCookie } from 'cookies-next'

import { GetServerSidePropsResult, NextPage } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'
import { JsonLdScript } from 'next-seo'

import { API, ApiModel, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, BreadcrumbJsonLd } from '@/components/common'
import {
    EventImportant,
    EventProgram,
    EventsList,
    EventUpcoming,
    ReviewsWidget,
    STARGAZING_REVIEWS_QUERY,
    StargazingGuide,
    StargazingHero
} from '@/components/pages/stargazing'
import { LandingSection } from '@/components/ui'
import teamPhoto from '@/public/photos/stargazing-8.jpeg'
import { STARGAZING_FOUNDING_YEAR } from '@/utils/constants'
import { getSecondsUntilUTCDate } from '@/utils/dates'
import { buildEventJsonLd } from '@/utils/eventJsonLd'
import { removeSSRQueryCache } from '@/utils/ssrCache'
import { initSSRLocale } from '@/utils/ssrLocale'

import styles from './index.module.sass'

interface StargazingPageProps {
    upcomingData: ApiModel.Event | null
    pastEvents: ApiModel.Event[]
}

const StargazingPage: NextPage<StargazingPageProps> = ({ upcomingData, pastEvents }) => {
    const { t } = useTranslation()

    const title = t('pages.stargazing.title', 'Астровыезды')

    // Only the active upcoming event gets Event markup — /stargazing is a listing page,
    // and /stargazing/history / past entries here are covered by their own event page.
    const upcomingEventJsonLd = upcomingData ? buildEventJsonLd(upcomingData) : null

    return (
        <AppLayout
            noTopMargin={true}
            canonical={'stargazing'}
            title={t('pages.stargazing.seo-title', 'Астровыезды в Оренбурге — наблюдение звёзд в телескоп')}
            description={t(
                'pages.stargazing.description',
                'Астровыезды в Оренбурге: вечер за городом с телескопами, лекцией о космосе и тёмным небом без засветки. Расписание ближайших выездов, программа, правила и запись.'
            )}
            openGraph={{
                images: [
                    {
                        height: 853,
                        url: '/photos/stargazing-4.jpeg',
                        width: 1280
                    }
                ]
            }}
        >
            <BreadcrumbJsonLd currentPage={title} />

            {upcomingEventJsonLd && (
                <JsonLdScript
                    scriptKey={'stargazing-upcoming-event'}
                    data={upcomingEventJsonLd}
                />
            )}

            <StargazingHero event={upcomingData || undefined} />

            <LandingSection
                id={'upcoming'}
                kicker={t('pages.stargazing.upcoming-kicker', 'Регистрация')}
                title={t('pages.stargazing.upcoming-title', 'Ближайший')}
                accent={t('pages.stargazing.upcoming-accent', 'астровыезд')}
            >
                <EventUpcoming event={upcomingData || undefined} />
            </LandingSection>

            <LandingSection
                id={'program'}
                kicker={t('pages.stargazing.program-kicker', 'Программа')}
                title={t('pages.stargazing.program-title-start', 'Как проходит')}
                accent={t('pages.stargazing.program-accent', 'вечер')}
                lead={t(
                    'pages.stargazing.program-lead',
                    'От заката до глубокой ночи: четыре части одного вечера под звёздами, 2–4 часа.'
                )}
            >
                <EventProgram />
            </LandingSection>

            <ReviewsWidget />

            <LandingSection
                kicker={t('pages.stargazing.guide-kicker', 'Перед поездкой')}
                title={t('pages.stargazing.guide-title', 'Всё, что стоит')}
                accent={t('pages.stargazing.guide-accent', 'знать заранее')}
            >
                <div className={styles.guide}>
                    <StargazingGuide />
                    <EventImportant />
                </div>
            </LandingSection>

            <LandingSection
                kicker={t('pages.stargazing.team-kicker', 'Команда')}
                title={t('pages.stargazing.team-title', 'Кто проводит')}
                accent={t('pages.stargazing.team-accent', 'астровыезды')}
            >
                <div className={styles.team}>
                    <div className={styles.teamPhoto}>
                        <Image
                            src={teamPhoto}
                            alt={t('pages.stargazing.team-photo-alt', 'Команда проекта «Смотри на звёзды»')}
                            placeholder={'blur'}
                            sizes={'(max-width: 768px) 100vw, 560px'}
                            fill
                        />
                    </div>
                    <div className={styles.teamText}>
                        <p>
                            {t(
                                'pages.stargazing.team-text',
                                'Мы астрономы-любители из Оренбурга. С {{year}} года привозим телескопы за город, читаем лекции о космосе и показываем небо всем, кто хочет увидеть его своими глазами.',
                                { year: STARGAZING_FOUNDING_YEAR }
                            )}
                        </p>
                        <Link
                            href={'/about'}
                            className={styles.teamLink}
                        >
                            {t('pages.stargazing.team-link', 'О проекте и команде')}
                        </Link>
                    </div>
                </div>
            </LandingSection>

            {pastEvents.length > 0 && (
                <LandingSection
                    kicker={t('pages.stargazing.past-kicker', 'Архив')}
                    title={t('pages.stargazing.past-title', 'Прошедшие')}
                    accent={t('pages.stargazing.past-events-accent', 'астровыезды')}
                    aside={
                        <Link href={'/stargazing/history'}>
                            {t('pages.stargazing.past-events-show-all', 'Смотреть все')}
                        </Link>
                    }
                >
                    <EventsList events={pastEvents} />
                </LandingSection>
            )}

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<StargazingPageProps>> => {
            // Guests get the cached HTML (config/nginx.conf bypasses the cache on the auth cookie);
            // short, so a freshly opened registration shows up within a couple of minutes
            context.res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600')

            const { translations } = await initSSRLocale(store, context, ['translation', 'stargazing'])
            const token = await getCookie('token', { req: context.req, res: context.res })

            if (token) {
                store.dispatch(setSSRToken(token))
            }

            const { data: upcomingData } = await store.dispatch(API.endpoints?.eventGetUpcoming.initiate())

            const { data: eventsData } = await store.dispatch(API.endpoints?.eventGetList.initiate())

            // The reviews are in the HTML (and for search engines), not loaded after the page
            void store.dispatch(API.endpoints?.commentsGetRandom.initiate(STARGAZING_REVIEWS_QUERY))

            // The numbers of the hero are in the HTML, not 0 until the page loads them
            void store.dispatch(API.endpoints?.statisticGetStargazing.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            // Handed to the page as props - no need to also ship RTK Query's copy
            removeSSRQueryCache(store, ['eventGetList'])

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
