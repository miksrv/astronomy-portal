import React from 'react'
import { getCookie } from 'cookies-next'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, setLocale, useAppSelector, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { EventHistorySection, MyReviewsSection, ProfileCard, UpcomingEventCard } from '@/components/pages/profile'

type ProfilePageProps = object

const ProfilePage: NextPage<ProfilePageProps> = () => {
    const { t } = useTranslation()

    const user = useAppSelector((state) => state.auth.user)

    const { data: upcomingEventData } = API.useEventGetUpcomingRegisteredQuery()
    const upcomingEvent = upcomingEventData?.item

    return (
        <AppLayout title={t('pages.profile.title', 'Личный кабинет')}>
            <AppToolbar title={t('pages.profile.title', 'Личный кабинет')} />

            {user && <ProfileCard user={user} />}

            <h2>{t('pages.profile.upcoming-event-title', 'Предстоящее мероприятие')}</h2>
            {upcomingEvent ? (
                <UpcomingEventCard event={upcomingEvent} />
            ) : (
                <Container>
                    <p>{t('pages.profile.no-upcoming-event', 'У вас нет предстоящих мероприятий')}</p>
                </Container>
            )}

            <h2>{t('pages.profile.history-title', 'История мероприятий')}</h2>
            {user && <EventHistorySection userId={user.id} />}

            <h2>{t('pages.profile.reviews-title', 'Мои отзывы')}</h2>
            {user && <MyReviewsSection userId={user.id} />}

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<ProfilePageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            const token = await getCookie('token', { req: context.req, res: context.res })

            if (!token) {
                return { redirect: { destination: '/auth', permanent: false } }
            }

            store.dispatch(setSSRToken(token as string))

            await store.dispatch(API.endpoints.authGetMe.initiate())
            await store.dispatch(API.endpoints.eventGetUpcomingRegistered.initiate())
            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default ProfilePage
