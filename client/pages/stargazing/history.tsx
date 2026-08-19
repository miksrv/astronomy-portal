import React from 'react'
import { getCookie } from 'cookies-next'
import { Button } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, useAppSelector, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { EventsList } from '@/components/pages/stargazing'
import { hasPermission } from '@/utils/permissions'
import { initSSRLocale } from '@/utils/ssrLocale'

interface StargazingHistoryPageProps {
    events: ApiModel.Event[]
}

const StargazingHistoryPage: NextPage<StargazingHistoryPageProps> = ({ events }) => {
    const { t } = useTranslation()

    const user = useAppSelector((state) => state.auth?.user)

    const title = t('pages.stargazing-history.title', 'Архив астровыездов')
    const description = t(
        'pages.stargazing-history.description',
        'Архив астровыездов — это летопись всех выездов проекта «Смотри на звёзды» под открытое небо в Оренбурге и его окрестностях. Здесь собраны фотографии, даты и подробности каждого мероприятия, где мы вместе смотрим на звёзды в телескоп. У каждой записи архива указано число участников и оставленные ими впечатления. Загляните в архив, чтобы увидеть, как год за годом растёт наше сообщество любителей астрономии.'
    )

    return (
        <AppLayout
            canonical={'stargazing/history'}
            title={title}
            description={description}
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
            <AppToolbar
                title={title}
                links={[{ link: '/stargazing', text: t('pages.stargazing.title', 'Астровыезды') }]}
                currentPage={title}
            >
                {hasPermission(user, ApiModel.Permission.EVENTS_CREATE) && (
                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        label={t('pages.stargazing.create-stargazing_button', 'Добавить астровыезд')}
                        link={'/stargazing/form'}
                    />
                )}
            </AppToolbar>

            {description}

            <EventsList
                events={events}
                groupByYear
            />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<StargazingHistoryPageProps>> => {
            const { translations } = await initSSRLocale(store, context)
            const token = await getCookie('token', { req: context.req, res: context.res })

            if (token) {
                store.dispatch(setSSRToken(token))
            }

            const { data: eventsData } = await store.dispatch(API.endpoints?.eventGetList.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    events: eventsData?.items || []
                }
            }
        }
)

export default StargazingHistoryPage
