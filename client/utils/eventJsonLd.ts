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

/** Reviews use a 1-5 star scale (see `ReviewForm`). */
const RATING_SCALE = { bestRating: 5, worstRating: 1 }

interface EventReviewsData {
    items: ApiModel.Comment[]
    total: number
}

const buildReviewJsonLd = (comment: ApiModel.Comment) => ({
    '@type': 'Review',
    author: {
        '@type': 'Person',
        name: comment.author?.name ?? 'Аноним'
    },
    datePublished: comment.createdAt,
    reviewBody: comment.content,
    ...(typeof comment.rating === 'number'
        ? {
              reviewRating: {
                  '@type': 'Rating',
                  ratingValue: comment.rating,
                  ...RATING_SCALE
              }
          }
        : {})
})

export const buildEventJsonLd = (event: ApiModel.Event, reviews?: EventReviewsData) => {
    const startDate = event.date?.date
    const endDate =
        event.endDate?.date ??
        (startDate ? dayjs(startDate).add(DEFAULT_EVENT_DURATION_HOURS, 'hour').toISOString() : undefined)

    const eventUrl = `${SITE_LINK}stargazing/${event.id}`
    const coverImageUrl =
        event.coverFileName && event.coverFileExt
            ? `${hosts.stargazing}${event.id}/${event.coverFileName}.${event.coverFileExt}`
            : undefined

    const ratedReviews = reviews?.items.filter((item) => typeof item.rating === 'number') ?? []
    // Only report an aggregate once every review for the event has actually been
    // fetched - callers only ever pass in the first page, so averaging that alone
    // would misrepresent the event to search engines whenever there are more.
    const hasCompleteReviewSet = !!reviews && reviews.items.length >= reviews.total
    const aggregateRating =
        hasCompleteReviewSet && ratedReviews.length > 0
            ? {
                  '@type': 'AggregateRating',
                  ratingValue: Number(
                      (ratedReviews.reduce((sum, item) => sum + (item.rating ?? 0), 0) / ratedReviews.length).toFixed(2)
                  ),
                  reviewCount: ratedReviews.length,
                  ...RATING_SCALE
              }
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
        aggregateRating,
        review: reviews?.items.length ? reviews.items.map(buildReviewJsonLd) : undefined,
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
