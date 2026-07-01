import { DateTime } from '@/api/types'

import { User } from './user'

export type Event = {
    id: string
    title: string
    location?: string
    content?: string
    coverFileName?: string
    coverFileExt?: string
    date?: DateTime
    members?: {
        total: number
        adults: number
        children: number
        /** Present alongside a 'pending'/'failed' booking — used to retry payment without re-filling the form. */
        childrenAges?: number[]
    }
    bookedId?: string
    registered?: boolean
    /**
     * Booking lifecycle: 'pending' holds the seat until payment, 'confirmed'
     * is paid/free, 'failed' is a declined/expired payment attempt kept
     * around (not deleted) so it can be retried instead of re-filling the form.
     */
    bookingStatus?: 'pending' | 'confirmed' | 'failed'
    /** Present only while a paid booking awaits payment — drives the countdown + "return to payment". */
    payment?: {
        orderId: string
        formUrl: string
        /** Server-computed seconds left on the payment hold (timezone-proof; client counts down from it). */
        expiresInSeconds: number
    }
    canceled?: boolean
    yandexMap?: string
    googleMap?: string
    photos?: EventPhoto[]
    registrationStart?: DateTime
    registrationEnd?: DateTime
    availableTickets?: number
    /** Price per adult in RUB. 0 / undefined means the event is free (children under 18 are always free). */
    ticketPrice?: number
    views?: number
}

export type EventPhoto = {
    eventId: string
    name: string
    ext: string
    width: number
    height: number
    title?: string
}

export type EventUser = User & {
    eventId: string
    name: string
    ext: string
    width: number
    height: number
    title?: string
}
