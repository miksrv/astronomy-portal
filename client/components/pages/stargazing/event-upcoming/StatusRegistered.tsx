import React from 'react'
import { Button } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { DateTime } from '@/api/types'
import { EventMap } from '@/components/common/event-map'
import { buildEventIcs, downloadIcsFile } from '@/utils/calendar'
import { SITE_LINK } from '@/utils/constants'

import { EventTicket } from '../event-ticket'

import styles from './styles.module.sass'

interface StatusRegisteredProps {
    eventId?: string
    title?: string
    date?: DateTime
    endDate?: DateTime
    location?: string
    address?: string
    latitude?: number
    longitude?: number
    bookingId?: string
    showCancelButton: boolean
    isLoading: boolean
    /**
     * 'compact' (profile page) splits into a two-column, equal-height layout
     * on desktop — map on the left, ticket + cancel button on the right —
     * and collapses back to a single stacked column on mobile.
     */
    isCompact?: boolean
    onCancelBooking: () => void
}

export const StatusRegistered: React.FC<StatusRegisteredProps> = ({
    eventId,
    title,
    date,
    endDate,
    location,
    address,
    latitude,
    longitude,
    bookingId,
    showCancelButton,
    isLoading,
    isCompact = false,
    onCancelBooking
}) => {
    const { t } = useTranslation()

    const hasMap = latitude !== undefined && longitude !== undefined

    const handleAddToCalendar = () => {
        if (!title || !date?.date || !bookingId) {
            return
        }

        const ics = buildEventIcs({
            uid: bookingId,
            title,
            start: date.date,
            end: endDate?.date,
            location,
            address,
            latitude,
            longitude,
            pageUrl: eventId ? `${SITE_LINK}/stargazing/${eventId}` : undefined
        })

        downloadIcsFile(`stargazing-${bookingId}.ics`, ics)
    }

    const addToCalendarButton = title && date?.date && bookingId && (
        <Button
            className={styles.stateActionButton}
            mode={'secondary'}
            stretched={true}
            onClick={handleAddToCalendar}
        >
            {t('components.pages.stargazing.event-upcoming.add-to-calendar', 'Добавить в календарь')}
        </Button>
    )

    const cancelButton = showCancelButton && (
        <Button
            className={styles.stateActionButton}
            mode={'secondary'}
            variant={'negative'}
            stretched={true}
            loading={isLoading}
            disabled={isLoading}
            onClick={onCancelBooking}
        >
            {t('components.pages.stargazing.event-upcoming.cancel-booking', 'Отменить бронирование')}
        </Button>
    )

    const actions = (addToCalendarButton || cancelButton) && (
        <div className={styles.registeredActions}>
            {addToCalendarButton}
            {cancelButton}
        </div>
    )

    if (isCompact) {
        return (
            <div className={styles.stateCard}>
                <div className={styles.registeredSplit}>
                    {hasMap && (
                        <EventMap
                            className={styles.map}
                            latitude={latitude}
                            longitude={longitude}
                            fillHeight={true}
                        />
                    )}

                    <div className={styles.registeredRight}>
                        {bookingId && (
                            <div className={styles.ticketBlock}>
                                <EventTicket bookingId={bookingId} />
                            </div>
                        )}

                        {actions}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.stateCard}>
            {hasMap && (
                <EventMap
                    className={styles.map}
                    latitude={latitude}
                    longitude={longitude}
                    height={200}
                />
            )}

            {bookingId && (
                <div className={styles.ticketBlock}>
                    <EventTicket bookingId={bookingId} />
                </div>
            )}

            {actions}
        </div>
    )
}
