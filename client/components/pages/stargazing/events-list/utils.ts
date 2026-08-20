import { ApiModel } from '@/api'
import { formatDate } from '@/utils/dates'

export interface EventsYearGroup {
    year: string
    events: ApiModel.Event[]
}

// Adjacent events sharing a year are merged into one group, relying on the
// API's newest-first ordering — no sorting/re-grouping by value is needed.
export const groupEventsByYear = (events: ApiModel.Event[]): EventsYearGroup[] => {
    const groups: EventsYearGroup[] = []

    events.forEach((event) => {
        const year = formatDate(event.date?.date, 'YYYY') || '—'
        const lastGroup = groups[groups.length - 1]

        if (lastGroup?.year === year) {
            lastGroup.events.push(event)
        } else {
            groups.push({ year, events: [event] })
        }
    })

    return groups
}
