import { DateTime } from '@/api/types'

import { User } from './user'

export interface Event {
    id: string
    title: string
    /** Venue name, e.g. "Загородная обсерватория «Смотри на звёзды»". Hidden pre-registration — see `address`. */
    location?: string
    /** Free-text address/directions. Hidden (along with `location`/`latitude`/`longitude`) until the viewer has a booking for an upcoming event that requires registration. */
    address?: string
    latitude?: number
    longitude?: number
    /** Minimum recommended age in years. Undefined/null means no restriction. */
    minAge?: number
    content?: string
    /** Short, plain-text (markdown-stripped) preview of `content` — present only in the events list/archive response, not on a single event. */
    excerpt?: string
    coverFileName?: string
    coverFileExt?: string
    date?: DateTime
    endDate?: DateTime
    members?: {
        total: number
        adults: number
        children: number
        /** Present alongside a 'pending'/'failed' booking — used to retry payment without re-filling the form. */
        childrenAges?: number[]
    }
    bookedId?: string
    /**
     * Whether the current viewer has a booking for this event. Present on a
     * single event (`show`/`upcoming`) *and* on every item of the list
     * response (`eventGetList`) as long as the request was authenticated —
     * omitted entirely for a guest, never sent for someone else's viewpoint.
     */
    registered?: boolean
    /**
     * Booking lifecycle: 'pending' holds the seat until payment, 'confirmed'
     * is paid/free, 'failed' is a declined/expired payment attempt kept
     * around (not deleted) so it can be retried instead of re-filling the form.
     */
    bookingStatus?: 'pending' | 'confirmed' | 'failed'
    /**
     * Whether the current viewer already left a review for this event.
     * Same viewer-scoped availability rule as `registered` — present in the
     * list response only for an authenticated request, omitted for guests.
     */
    hasReviewed?: boolean
    /** Present only while a paid booking awaits payment — drives the countdown + "return to payment". */
    payment?: {
        orderId: string
        formUrl: string
        /** Server-computed seconds left on the payment hold (timezone-proof; client counts down from it). */
        expiresInSeconds: number
    }
    canceled?: boolean
    photos?: EventPhoto[]
    /** False for events that never went through online booking (sidewalk astronomy, legacy archive imports) — no registration window applies. */
    requiresRegistration?: boolean
    registrationStart?: DateTime
    registrationEnd?: DateTime
    availableTickets?: number
    /** Price per adult in RUB. 0 / undefined means the event is free (children under 18 are always free). */
    ticketPrice?: number
    views?: number
}

export interface EventPhoto {
    eventId: string
    name: string
    ext: string
    width: number
    height: number
    /** Free-text photographer credit, entered at upload time. */
    photographer?: string
    /** ISO datetime the photo was taken (from EXIF `DateTimeOriginal`), used for chronological ordering. */
    takenAt?: string
}

export interface EventUser extends User {
    eventId: string
    name: string
    ext: string
    width: number
    height: number
    title?: string
}
