import { ApiModel } from '@/api'
import { formatUTCDate } from '@/utils/dates'

import { EVENT_META, EventMeta, FALLBACK_EVENT_META } from './constants'

export const getEventMeta = (type: string): EventMeta => EVENT_META[type] ?? FALLBACK_EVENT_META

/** The device is worth a line only when the event's text does not already say it */
export const getEventDevice = ({ type, device }: Pick<ApiModel.ObservatoryEvent, 'type' | 'device'>) =>
    device && !getEventMeta(type).deviceImplied ? device : undefined

export type DayKind = 'today' | 'yesterday' | 'date'

export interface EventDay {
    /** The Orenburg date, YYYY-MM-DD */
    key: string
    kind: DayKind
    /** A moment of that day (the first event's), to format the date from */
    time: string
    events: ApiModel.ObservatoryEvent[]
}

const dayKey = (time: string | Date): string => formatUTCDate(time, 'YYYY-MM-DD', 'en') ?? ''

/**
 * Events grouped by the Orenburg day they happened on, the latest day first. Without `now`
 * (before hydration) every day is named by its date, so the server and the client agree.
 */
export const groupEventsByDay = (events: ApiModel.ObservatoryEvent[], now?: Date): EventDay[] => {
    const today = now ? dayKey(now) : undefined
    const yesterday = now ? dayKey(new Date(now.getTime() - 86_400_000)) : undefined

    const days: EventDay[] = []

    for (const event of events) {
        const key = dayKey(event.time)
        const last = days[days.length - 1]

        if (last?.key === key) {
            last.events.push(event)
        } else {
            days.push({
                key,
                kind: key === today ? 'today' : key === yesterday ? 'yesterday' : 'date',
                time: event.time,
                events: [event]
            })
        }
    }

    return days
}
