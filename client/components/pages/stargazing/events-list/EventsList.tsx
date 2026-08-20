import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { ApiModel, useAppSelector } from '@/api'
import { getSecondsUntilUTCDate } from '@/utils/dates'
import { hasPermission } from '@/utils/permissions'

import { EventRow } from '../event-row'

import { EventsYearGroup, groupEventsByYear } from './utils'

import styles from './styles.module.sass'

interface EventsListProps {
    events?: ApiModel.Event[]
    /** Group events into per-year sections with a timeline marker. Assumes `events` is already sorted newest-first. */
    groupByYear?: boolean
}

export const EventsList: React.FC<EventsListProps> = ({ events, groupByYear = false }) => {
    const { t } = useTranslation()

    const user = useAppSelector((state) => state.auth?.user)

    const canViewStatistic = hasPermission(user, ApiModel.Permission.EVENTS_STATISTIC)

    const renderEventRow = (event: ApiModel.Event) => {
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
    }

    if (!groupByYear) {
        return <div className={styles.eventsList}>{events?.map(renderEventRow)}</div>
    }

    const groups: EventsYearGroup[] = groupEventsByYear(events || [])

    return (
        <div className={styles.eventsTimeline}>
            {groups.map((group) => (
                <div
                    key={group.year}
                    className={styles.yearGroup}
                >
                    <div className={styles.yearHeader}>
                        <span
                            className={styles.yearDot}
                            aria-hidden
                        />
                        <span className={styles.yearLabel}>{group.year}</span>
                    </div>

                    <div className={styles.yearEvents}>{group.events.map(renderEventRow)}</div>
                </div>
            ))}
        </div>
    )
}
