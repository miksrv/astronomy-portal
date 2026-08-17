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
    /** Short plain-text preview of the event description, shown after the location. */
    excerpt?: string
    coverFileName?: string
    coverFileExt?: string
    /** Rendered as an icon + count next to the location. */
    views?: number
    /** Rendered as an icon + count next to the location. */
    membersCount?: number
    /** When present, membersCount links to the event's statistic page instead of a static block. */
    statisticHref?: string
    /** Whether the current viewer attended this event (a confirmed booking for an already-past date) — omitted entirely for a guest. */
    attended?: boolean
    /** Whether the current viewer already left a review for this event — omitted entirely for a guest. */
    hasReviewed?: boolean
}

export const EventRow: React.FC<EventRowProps> = ({
    id,
    title,
    linkTitle,
    date,
    location,
    excerpt,
    coverFileName,
    coverFileExt,
    views,
    membersCount,
    statisticHref,
    attended,
    hasReviewed
}) => {
    const { t } = useTranslation()

    const itemTitle = linkTitle || title

    const dateLabel = t('pages.stargazing.event-date-label', 'Дата')
    const attendedLabel = t('pages.profile.history-visited', 'Посещено')
    const reviewedLabel = t('components.pages.stargazing.event-row.reviewed', 'Отзыв')
    const noReviewLabel = t('components.pages.stargazing.event-row.no-review', 'Без отзыва')
    const viewsCount = views || 0
    const membersCountValue = membersCount || 0

    const formattedDate = formatDate(date, 'D MMMM YYYY')

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
            <Link
                className={styles.primaryLink}
                href={`/stargazing/${id}`}
                title={itemTitle}
            >
                <div className={cn(styles.thumbnail, !coverFileName && styles.thumbnailEmpty)}>
                    {coverFileName ? (
                        <Image
                            alt={itemTitle}
                            quality={70}
                            width={140}
                            height={100}
                            src={`${hosts.stargazing}${id}/${coverFileName}_preview.${coverFileExt}`}
                        />
                    ) : (
                        <Icon
                            name={'Moon'}
                            aria-hidden
                        />
                    )}
                </div>

                {date && (
                    <div
                        className={styles.dateBlock}
                        aria-label={`${dateLabel}: ${formattedDate}`}
                    >
                        <span className={styles.dateMonth}>{formatDate(date, 'MMM')?.replace('.', '')}</span>
                        <span className={styles.dateDay}>{formatDate(date, 'D')}</span>
                        <span className={styles.dateYear}>{formatDate(date, 'YYYY')}</span>
                    </div>
                )}

                <div className={styles.content}>
                    <div className={styles.titleRow}>
                        <div className={styles.title}>{title}</div>

                        {statsBadges}
                    </div>

                    <div className={styles.metaRow}>
                        {location && (
                            <span className={styles.location}>
                                <Icon
                                    name={'PinDrop'}
                                    aria-hidden
                                />
                                {location}
                            </span>
                        )}

                        {location && (
                            <span
                                className={styles.metaDivider}
                                aria-hidden
                            >
                                •
                            </span>
                        )}

                        {statisticHref ? (
                            <Link
                                className={styles.metaStat}
                                href={statisticHref}
                            >
                                <Icon
                                    name={'Users'}
                                    aria-hidden
                                />
                                {membersCountValue}
                            </Link>
                        ) : (
                            <span className={styles.metaStat}>
                                <Icon
                                    name={'Users'}
                                    aria-hidden
                                />
                                {membersCountValue}
                            </span>
                        )}

                        <span
                            className={styles.metaDivider}
                            aria-hidden
                        >
                            •
                        </span>

                        <span className={styles.metaStat}>
                            <Icon
                                name={'Eye'}
                                aria-hidden
                            />
                            {viewsCount}
                        </span>
                    </div>

                    {excerpt && <div className={styles.excerpt}>{excerpt}</div>}
                </div>
            </Link>

            <Icon
                className={styles.chevron}
                name={'KeyboardRight'}
                aria-hidden
            />
        </Container>
    )
}
