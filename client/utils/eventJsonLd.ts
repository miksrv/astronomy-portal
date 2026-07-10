import dayjs from 'dayjs'

import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { SITE_LINK } from '@/utils/constants'

import { removeMarkdown, sliceText } from './strings'

/** Duration assumed for events with no explicit `endDate` (e.g. legacy imports) — a typical stargazing evening. */
const DEFAULT_EVENT_DURATION_HOURS = 3

const ORGANIZATION = {
    '@type': 'Organization',
    name: 'Смотри на звёзды',
    url: SITE_LINK?.replace(/\/$/, '')
}

export const buildEventJsonLd = (event: ApiModel.Event) => {
    const startDate = event.date?.date
    const endDate = event.endDate?.date ?? (startDate ? dayjs(startDate).add(DEFAULT_EVENT_DURATION_HOURS, 'hour').toISOString() : undefined)

    const eventUrl = `${SITE_LINK}stargazing/${event.id}`
    const coverImageUrl =
        event.coverFileName && event.coverFileExt
            ? `${hosts.stargazing}${event.id}/${event.coverFileName}.${event.coverFileExt}`
            : undefined

    return {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        description: sliceText(removeMarkdown(event.content ?? ''), 300),
        startDate,
        endDate,
        eventStatus: event.canceled ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
            '@type': 'Place',
            name: event.location ?? 'Оренбургская область',
            address: {
                '@type': 'PostalAddress',
                addressLocality: 'Оренбург',
                addressCountry: 'RU'
            }
        },
        organizer: ORGANIZATION,
        performer: ORGANIZATION,
        offers: {
            '@type': 'Offer',
            price: event.ticketPrice ?? 0,
            priceCurrency: 'RUB',
            availability:
                (event.availableTickets ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
            url: eventUrl
        },
        image: coverImageUrl,
        url: eventUrl
    }
}
