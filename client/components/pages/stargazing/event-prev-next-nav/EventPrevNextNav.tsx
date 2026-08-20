import React from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

interface EventPrevNextNavProps {
    prevEvent?: ApiModel.Event | null
    nextEvent?: ApiModel.Event | null
}

export const EventPrevNextNav: React.FC<EventPrevNextNavProps> = ({ prevEvent, nextEvent }) => {
    const { t } = useTranslation()

    if (!prevEvent && !nextEvent) {
        return null
    }

    // Cover width isn't known ahead of time (portrait/landscape uploads both
    // happen) - a plain <img> sized only by CSS height lets the browser keep
    // its real aspect ratio instead of next/image's fixed width/height box,
    // which would otherwise crop or letterbox it.
    const renderThumbnail = (event: ApiModel.Event) => (
        <div className={cn(styles.thumbnail, !event.coverFileName && styles.thumbnailEmpty)}>
            {event.coverFileName && event.coverFileExt ? (
                // eslint-disable-next-line next/no-img-element -- intentional: auto width from the real image, not a fixed next/image box
                <img
                    className={styles.thumbnailImage}
                    alt={event.title}
                    src={`${hosts.stargazing}${event.id}/${event.coverFileName}_preview.${event.coverFileExt}`}
                />
            ) : (
                <Icon
                    name={'Moon'}
                    aria-hidden
                />
            )}
        </div>
    )

    return (
        <nav
            className={styles.nav}
            aria-label={t('components.pages.stargazing.event-prev-next-nav.label', 'Навигация по мероприятиям')}
        >
            {prevEvent && (
                <Link
                    href={`/stargazing/${prevEvent.id}`}
                    title={prevEvent.title}
                    className={cn(styles.link, styles.linkPrev)}
                >
                    <Icon
                        name={'KeyboardLeft'}
                        className={styles.arrow}
                        aria-hidden
                    />

                    {renderThumbnail(prevEvent)}

                    <div className={styles.body}>
                        <div className={styles.title}>{prevEvent.title}</div>
                        {prevEvent.date?.date && (
                            <div className={styles.date}>{formatDate(prevEvent.date.date, 'D MMMM YYYY')}</div>
                        )}
                    </div>
                </Link>
            )}

            {nextEvent && (
                <Link
                    href={`/stargazing/${nextEvent.id}`}
                    title={nextEvent.title}
                    className={cn(styles.link, styles.linkNext)}
                >
                    <div className={styles.body}>
                        <div className={styles.title}>{nextEvent.title}</div>
                        {nextEvent.date?.date && (
                            <div className={styles.date}>{formatDate(nextEvent.date.date, 'D MMMM YYYY')}</div>
                        )}
                    </div>

                    {renderThumbnail(nextEvent)}

                    <Icon
                        name={'KeyboardRight'}
                        className={styles.arrow}
                        aria-hidden
                    />
                </Link>
            )}
        </nav>
    )
}
