import React from 'react'
import { getCookie } from 'cookies-next'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { EventsList } from '@/components/pages/stargazing'
import { removeSSRQueryCache } from '@/utils/ssrCache'
import { initSSRLocale } from '@/utils/ssrLocale'

interface StargazingHistoryPageProps {
    events: ApiModel.Event[]
}

const StargazingHistoryPage: NextPage<StargazingHistoryPageProps> = ({ events }) => {
    const { t } = useTranslation()

    const title = t('pages.stargazing-history.title', 'Архив астровыездов')
    // One text: the page's opening paragraph and its description for search engines
    const description = t(
        'pages.stargazing-history.description',
        'Здесь собраны все наши астровыезды и вечера тротуарной астрономии: от первых поездок за город до ночей, на которые приезжает больше тысячи человек. У каждого выезда своя страница с фотографиями и видео, темой лекции, числом участников и отзывами тех, кто был с нами под звёздами. Листайте по годам, вспоминайте свои ночи и выбирайте, на какой выезд поехать в следующий раз.'
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
                lead={description}
                actions={[
                    {
                        key: 'create',
                        icon: 'PlusCircle',
                        label: t('pages.stargazing.create_button', 'Добавить'),
                        link: '/stargazing/form',
                        permission: ApiModel.Permission.EVENTS_CREATE
                    }
                ]}
            />

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
            // Public page: nginx caches the guest HTML for a short while (config/nginx.conf)
            context.res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1200')

            const { translations } = await initSSRLocale(store, context, ['translation', 'stargazing'])
            const token = await getCookie('token', { req: context.req, res: context.res })

            if (token) {
                store.dispatch(setSSRToken(token))
            }

            const { data: eventsData } = await store.dispatch(API.endpoints?.eventGetList.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            // Handed to the page as props - no need to also ship RTK Query's copy
            removeSSRQueryCache(store, ['eventGetList'])

            return {
                props: {
                    ...translations,
                    events: eventsData?.items || []
                }
            }
        }
)

export default StargazingHistoryPage
