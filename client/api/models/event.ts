import { DateTime } from '@/api/types'

export type Event = {
    id: string
    title: string
    content?: string
    coverFileName?: string
    coverFileExt?: string
    date?: DateTime
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
