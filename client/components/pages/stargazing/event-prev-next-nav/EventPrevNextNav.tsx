import React from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import Image from 'next/image'
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
    // happen), so next/image gets a 0×0 intrinsic size and is sized only by the
    // CSS height (`width: auto`) - the browser keeps the real aspect ratio
    // instead of a fixed width/height box that would crop or letterbox it, while
    // the image still goes through the optimizer instead of the full-size
    // original preview (hundreds of KB for a 46px-tall thumbnail).
    const renderThumbnail = (event: ApiModel.Event) => (
        <div className={cn(styles.thumbnail, !event.coverFileName && styles.thumbnailEmpty)}>
            {event.coverFileName && event.coverFileExt ? (
                <Image
                    className={styles.thumbnailImage}
                    alt={event.title}
                    src={`${hosts.stargazing}${event.id}/${event.coverFileName}_preview.${event.coverFileExt}`}
                    width={0}
                    height={0}
                    // 46px tall; even a wide landscape cover is at most ~2:1
                    sizes={'96px'}
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
