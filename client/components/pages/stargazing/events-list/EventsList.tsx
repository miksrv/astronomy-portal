import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel, useAppSelector } from '@/api'
import { getSecondsUntilUTCDate } from '@/utils/dates'
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
            {events?.map((event) => {
                // The "Посещено" badge only makes sense for an event that's
                // already happened — an upcoming confirmed booking is "Вы
                // записаны", not "attended", and that state is covered
                // elsewhere (EventUpcoming), not on this card.
                const isPastEvent = (getSecondsUntilUTCDate(event.date?.date) ?? 0) < 0
                const attended = isPastEvent && event.registered && event.bookingStatus === 'confirmed'

                return (
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
                        attended={attended}
                        hasReviewed={event.hasReviewed}
                    />
                )
            })}
        </div>
    )
}
