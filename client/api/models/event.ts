import { DateTime } from '@/api/types'

export type Event = {
    id: string
    title: string
    content?: string
    cover?: string
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
    name: string
    ext: string
    width: number
    height: number
}
