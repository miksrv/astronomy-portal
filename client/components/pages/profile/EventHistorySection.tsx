import React from 'react'
import dayjs from 'dayjs'
import { Container } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { EventRow } from '@/components/pages/stargazing'

import { EventHistorySectionSkeleton } from './EventHistorySectionSkeleton'

import styles from './styles.module.sass'

interface EventHistorySectionProps {
    userId?: string
}

export const EventHistorySection: React.FC<EventHistorySectionProps> = ({ userId }) => {
    const { t } = useTranslation()

    const { data, isLoading } = API.useUsersGetEventsQuery(userId!, { skip: !userId })

    if (isLoading) {
        return <EventHistorySectionSkeleton />
    }

    if (!data?.items?.length) {
        return (
            <Container>
                <p>{t('pages.profile.history-empty', 'Вы ещё не посещали мероприятий')}</p>
            </Container>
        )
    }

    return (
        <div className={styles.historyList}>
            {data.items.map((event) => {
                const itemTitle = t('pages.profile.history-item-title', 'Астровыезд - {{title}}', {
                    title: event.title
                })

                // The event date is stored/returned as UTC — compare against local
                // "now" to tell an already-happened trip from an upcoming one the
                // user has simply registered for.
                const isPastEvent = dayjs.utc(event.date).local().diff(dayjs()) <= 0

                return (
                    <EventRow
                        key={event.id}
                        variant={'personal'}
                        id={event.id}
                        title={event.title}
                        linkTitle={itemTitle}
                        date={event.date}
                        location={event.location}
                        coverFileName={event.coverFileName}
                        coverFileExt={event.coverFileExt}
                        adults={event.adults}
                        childrenCount={event.children}
                        visited={isPastEvent}
                    />
                )
            })}
        </div>
    )
}
