import React from 'react'
import { getCookie } from 'cookies-next'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, ApiModel, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { EventStatistic } from '@/components/pages/stargazing'

interface StargazingStatisticPageProps {
    eventId: string
    eventTitle: string | null
}

const StargazingStatisticPage: NextPage<StargazingStatisticPageProps> = ({ eventId, eventTitle }) => {
    const { t } = useTranslation()

    const title = `${t('menu.stargazing', 'Астровыезды')} - ${eventTitle} - ${t('pages.stargazing.statistic-title', 'Статистика мероприятия')}`

    return (
        <AppLayout
            canonical={`stargazing/${eventId}/statistic`}
            title={title}
        >
            <AppToolbar
                title={title}
                currentPage={t('pages.stargazing.statistic-title', 'Статистика мероприятия')}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', 'Астровыезды')
                    },
                    {
                        link: `/stargazing/${eventId}`,
                        text: eventTitle ?? ''
                    }
                ]}
            />

            <EventStatistic eventId={eventId} />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<StargazingStatisticPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const eventId = context.params?.name

            if (typeof eventId !== 'string') {
                return { notFound: true }
            }

            store.dispatch(setLocale(locale))

            const token = await getCookie('token', { req: context.req, res: context.res })

            if (!token) {
                return { redirect: { destination: `/stargazing/${eventId}`, permanent: false } }
            }

            store.dispatch(setSSRToken(token))

            const { data: authData } = await store.dispatch(API.endpoints.authGetMe.initiate())

            const role = authData?.user?.role

            if (role !== ApiModel.UserRole.ADMIN && role !== ApiModel.UserRole.MODERATOR) {
                return { redirect: { destination: `/stargazing/${eventId}`, permanent: false } }
            }

            const { data: eventData, isError } = await store.dispatch(API.endpoints?.eventGetItem.initiate(eventId))

            if (isError) {
                return { notFound: true }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    eventId,
                    eventTitle: eventData?.title ?? null
                }
            }
        }
)

export default StargazingStatisticPage
