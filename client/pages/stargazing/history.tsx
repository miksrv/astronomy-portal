import React from 'react'
import { getCookie } from 'cookies-next'
import { Button } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, ApiModel, setLocale, useAppSelector, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { EventsList } from '@/components/pages/stargazing'

interface StargazingHistoryPageProps {
    events: ApiModel.Event[]
}

const StargazingHistoryPage: NextPage<StargazingHistoryPageProps> = ({ events }) => {
    const { t } = useTranslation()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const title = t('pages.stargazing-history.title', 'Архив астровыездов')

    return (
        <AppLayout
            canonical={'stargazing/history'}
            title={title}
            description={t(
                'pages.stargazing-history.description',
                'Список всех прошедших астровыездов в Оренбурге — фотографии, даты, участники и впечатления с каждого мероприятия.'
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
            <AppToolbar
                title={title}
                links={[{ link: '/stargazing', text: t('pages.stargazing.title', 'Астровыезды') }]}
                currentPage={title}
            >
                {userRole === ApiModel.UserRole.ADMIN && (
                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        label={t('pages.stargazing.create-stargazing_button', 'Добавить астровыезд')}
                        link={'/stargazing/form'}
                    />
                )}
            </AppToolbar>

            <EventsList events={events} />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<StargazingHistoryPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

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
