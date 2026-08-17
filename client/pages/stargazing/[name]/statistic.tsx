import React from 'react'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, wrapper } from '@/api'
import { useAppSelector } from '@/api/store'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { EventRegistrationsTable, EventStatistic, EventStatisticRefreshInfo } from '@/components/pages/stargazing'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { hasPermission } from '@/utils/permissions'

interface StargazingStatisticPageProps {
    eventId: string
    eventTitle: string | null
}

const StargazingStatisticPage: NextPage<StargazingStatisticPageProps> = ({ eventId, eventTitle }) => {
    const { t } = useTranslation()
    const user = useAppSelector((state) => state.auth.user)
    const canViewUsers = hasPermission(user, ApiModel.Permission.EVENTS_USERS)

    const title = `${t('menu.stargazing', 'Астровыезды')} - ${eventTitle} - ${t('pages.stargazing.statistic-title', 'Статистика')}`
    const heading = `${eventTitle} - ${t('pages.stargazing.statistic-title', 'Статистика')}`

    return (
        <AppLayout
            canonical={`stargazing/${eventId}/statistic`}
            title={title}
            noindex={true}
            nofollow={true}
        >
            <AppToolbar
                title={heading}
                currentPage={t('pages.stargazing.statistic-title', 'Статистика')}
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
                afterBreadcrumbs={<EventStatisticRefreshInfo eventId={eventId} />}
            />

            <EventStatistic eventId={eventId} />

            {canViewUsers && <EventRegistrationsTable eventId={eventId} />}

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<StargazingStatisticPageProps>> => {
            const eventId = context.params?.name

            if (typeof eventId !== 'string') {
                return { notFound: true }
            }

            const guard = await requirePermissionSSR(
                store,
                context,
                ApiModel.Permission.EVENTS_STATISTIC,
                `/stargazing/${eventId}`
            )

            if (!guard.ok) {
                return { redirect: guard.redirect }
            }

            const { data: eventData, isError } = await store.dispatch(API.endpoints?.eventGetItem.initiate(eventId))

            if (isError) {
                return { notFound: true }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...guard.translations,
                    eventId,
                    eventTitle: eventData?.title ?? null
                }
            }
        }
)

export default StargazingStatisticPage
