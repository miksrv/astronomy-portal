import { DateTime } from '@/api/types'

export type Event = {
    id: string
    title: string
    content?: string
    cover?: string
    date?: DateTime
    registered?: boolean
    yandexMap?: string
    googleMap?: string
    registrationStart?: DateTime
    registrationEnd?: DateTime
    availableTickets?: number
}
