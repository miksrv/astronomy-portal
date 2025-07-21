import { DateTime } from '@/api/types'

import { User } from './user'

export type Event = {
    id: string
    title: string
    content?: string
    coverFileName?: string
    coverFileExt?: string
    date?: DateTime
    members?: {
        total: number
        adults: number
        children: number
    }
    bookedId?: string
    registered?: boolean
    canceled?: boolean
    yandexMap?: string
    googleMap?: string
    photos?: EventPhoto[]
    registrationStart?: DateTime
    registrationEnd?: DateTime
    availableTickets?: number
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
