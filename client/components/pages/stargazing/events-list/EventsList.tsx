import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel, useAppSelector } from '@/api'
import { hasPermission } from '@/utils/permissions'

import { EventRow } from '../event-row'

import styles from './styles.module.sass'

interface EventsListProps {
    events?: ApiModel.Event[]
}

export const EventsList: React.FC<EventsListProps> = ({ events }) => {
    const { t } = useTranslation()

    const user = useAppSelector((state) => state.auth?.user)

    const canViewStatistic = hasPermission(user, ApiModel.Permission.EVENTS_STATISTIC)

    return (
        <div className={styles.eventsList}>
            {events?.map((event) => (
                <EventRow
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    linkTitle={t('components.pages.stargazing.events-list.item-title', 'Астровыезд - {{title}}', {
                        title: event.title
                    })}
                    date={event?.date?.date}
                    location={event.location}
                    excerpt={event.excerpt}
                    coverFileName={event.coverFileName}
                    coverFileExt={event.coverFileExt}
                    views={event?.views}
                    membersCount={event?.members?.total || event?.availableTickets}
                    statisticHref={canViewStatistic ? `/stargazing/${event.id}/statistic` : undefined}
                />
            ))}
        </div>
    )
}
