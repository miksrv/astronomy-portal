import React from 'react'
import { Badge, cn, Container, Icon } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { hosts } from '@/api/constants'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

export type EventRowVariant = 'public' | 'personal'

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
    /** 'public' (event lists) shows views + members/spots next to the location; 'personal' (profile history) shows the user's own booking. Defaults to 'public'. */
    variant?: EventRowVariant
    /** variant="public" only — rendered as an icon + count next to the location */
    views?: number
    /** variant="public" only — rendered as an icon + count next to the location */
    membersCount?: number
    /** variant="public" only — when present, membersCount links to the event's statistic page instead of a static block. */
    statisticHref?: string
    /** variant="personal" only — adults on this user's own booking */
    adults?: number
    /** variant="personal" only — children on this user's own booking */
    childrenCount?: number
    /** variant="personal" only — whether the event date has already passed */
    visited?: boolean
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
    variant = 'public',
    views,
    membersCount,
    statisticHref,
    adults,
    childrenCount,
    visited
}) => {
    const { t } = useTranslation()

    const itemTitle = linkTitle || title

    const dateLabel = t('pages.stargazing.event-date-label', 'Дата')
    const visitedLabel = t('pages.profile.history-visited', 'Посещено')
    const viewsCount = views || 0
    const membersCountValue = membersCount || 0
    const guestsSummary = t(
        'components.pages.stargazing.event-row.guests',
        'Взрослых: {{adults}}, детей: {{children}}',
        { adults: adults || 0, children: childrenCount || 0 }
    )

    const formattedDate = formatDate(date, 'D MMMM YYYY')

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
                    <div className={styles.title}>{title}</div>

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

                        {variant === 'public' && (
                            <>
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
                            </>
                        )}
                    </div>

                    {excerpt && <div className={styles.excerpt}>{excerpt}</div>}
                </div>
            </Link>

            {variant === 'personal' && (
                <div className={styles.stats}>
                    {visited && (
                        <Badge
                            className={styles.visitedBadge}
                            icon={'CheckCircle'}
                            label={visitedLabel}
                            size={'small'}
                        />
                    )}
                    <div className={styles.guests}>{guestsSummary}</div>
                </div>
            )}

            <Icon
                className={styles.chevron}
                name={'KeyboardRight'}
                aria-hidden
            />
        </Container>
    )
}
