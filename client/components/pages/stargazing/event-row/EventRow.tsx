import React from 'react'
import { Badge, cn, Container, Icon } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { hosts } from '@/api/constants'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

interface EventRowProps {
    id: string
    title: string
    /** Accessible/hover title for the links, e.g. "Астровыезд - {{title}}". Falls back to `title`. */
    linkTitle?: string
    date?: string
    location?: string
    /** Short plain-text preview of the event description, under the title. */
    excerpt?: string
    coverFileName?: string
    coverFileExt?: string
    /** How many people came: «1 611 участников» on the meta line. */
    membersCount?: number
    /** When present, membersCount links to the event's statistic page instead of a static block. */
    statisticHref?: string
    /** Whether the current viewer attended this event (a confirmed booking for an already-past date) — omitted entirely for a guest. */
    attended?: boolean
    /** Whether the current viewer already left a review for this event — omitted entirely for a guest. */
    hasReviewed?: boolean
}

/**
 * An event in a list (the past events of /stargazing, the archive, the profile): the cover in its
 * own 16:9 (the full image through the optimizer: the server's preview crops the posters' text),
 * the date as a kicker over the title, the title on up to two lines, the place and the number of
 * participants, the start of the description. The whole card is one link (the title's, stretched
 * over it); the editor's link to the statistics lies above it, on the meta line.
 */
export const EventRow: React.FC<EventRowProps> = ({
    id,
    title,
    linkTitle,
    date,
    location,
    excerpt,
    coverFileName,
    coverFileExt,
    membersCount,
    statisticHref,
    attended,
    hasReviewed
}) => {
    const { t, i18n } = useTranslation()

    const itemTitle = linkTitle || title

    const attendedLabel = t('pages.profile.history-visited', 'Посещено')
    const reviewedLabel = t('components.pages.stargazing.event-row.reviewed', 'Отзыв')
    const noReviewLabel = t('components.pages.stargazing.event-row.no-review', 'Без отзыва')

    const formattedDate = formatDate(date, 'D MMMM YYYY', i18n.language)

    // An editor keeps the way to the statistics even with no participants yet ("0 участников")
    const membersLabel =
        membersCount || statisticHref
            ? t('components.pages.stargazing.event-row.members', '{{formattedCount}} участников', {
                  count: membersCount ?? 0,
                  formattedCount: (membersCount ?? 0).toLocaleString(i18n.language)
              })
            : undefined

    const statsBadges = (attended || hasReviewed) && (
        <div className={styles.stats}>
            {attended && (
                <Badge
                    className={styles.greenBadge}
                    icon={'CheckCircle'}
                    label={attendedLabel}
                    size={'small'}
                />
            )}
            {hasReviewed && (
                <Badge
                    className={styles.greenBadge}
                    icon={'StarFilled'}
                    label={reviewedLabel}
                    size={'small'}
                />
            )}
            {attended && !hasReviewed && (
                <Badge
                    className={styles.redBadge}
                    icon={'StarEmpty'}
                    label={noReviewLabel}
                    size={'small'}
                />
            )}
        </div>
    )

    return (
        <Container className={styles.eventRow}>
            <div className={styles.layout}>
                <div className={cn(styles.thumbnail, !coverFileName && styles.thumbnailEmpty)}>
                    {coverFileName ? (
                        <Image
                            alt={''}
                            fill
                            sizes={'(max-width: 768px) 128px, 240px'}
                            src={`${hosts.stargazing}${id}/${coverFileName}.${coverFileExt}`}
                        />
                    ) : (
                        <Icon
                            name={'Moon'}
                            aria-hidden
                        />
                    )}
                </div>

                <div className={styles.content}>
                    {date && (
                        <time
                            className={styles.date}
                            dateTime={date}
                        >
                            {formattedDate}
                        </time>
                    )}

                    {/* The card's one link: the title, stretched over the whole card (DESIGN §6) */}
                    <h3 className={styles.title}>
                        <Link
                            className={styles.cardLink}
                            href={`/stargazing/${id}`}
                            title={itemTitle}
                        >
                            {title}
                        </Link>
                    </h3>

                    {excerpt && <p className={styles.excerpt}>{excerpt}</p>}

                    <div className={styles.metaRow}>
                        {location && (
                            <span className={styles.metaItem}>
                                <Icon
                                    name={'PinDrop'}
                                    aria-hidden
                                />
                                {location}
                            </span>
                        )}

                        {membersLabel &&
                            (statisticHref ? (
                                // The editor's way to the statistics: above the stretched link
                                <Link
                                    className={cn(styles.metaItem, styles.statisticLink)}
                                    href={statisticHref}
                                >
                                    <Icon
                                        name={'Users'}
                                        aria-hidden
                                    />
                                    {membersLabel}
                                </Link>
                            ) : (
                                <span className={styles.metaItem}>
                                    <Icon
                                        name={'Users'}
                                        aria-hidden
                                    />
                                    {membersLabel}
                                </span>
                            ))}

                        {statsBadges}
                    </div>
                </div>
            </div>

            <Icon
                className={styles.chevron}
                name={'KeyboardRight'}
                aria-hidden
            />
        </Container>
    )
}
