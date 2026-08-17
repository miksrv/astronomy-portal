import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel, useAppSelector } from '@/api'
import { hasPermission } from '@/utils/permissions'

import { EventRow } from '../event-row'

interface EventsListItemProps {
    event: ApiModel.Event
}

export const EventsListItem: React.FC<EventsListItemProps> = ({ event }) => {
    const { t } = useTranslation()

    const user = useAppSelector((state) => state.auth?.user)

    const canViewStatistic = hasPermission(user, ApiModel.Permission.EVENTS_STATISTIC)

    const itemTitle = t('components.pages.stargazing.events-list.item-title', 'Астровыезд - {{title}}', {
        title: event.title
    })

    return (
        <EventRow
            id={event.id}
            title={event.title}
            linkTitle={itemTitle}
            date={event?.date?.date}
            location={event.location}
            excerpt={event.excerpt}
            coverFileName={event.coverFileName}
            coverFileExt={event.coverFileExt}
            views={event?.views}
            membersCount={event?.members?.total || event?.availableTickets}
            statisticHref={canViewStatistic ? `/stargazing/${event.id}/statistic` : undefined}
        />
    )
}
