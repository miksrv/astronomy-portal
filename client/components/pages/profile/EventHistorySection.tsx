import React from 'react'
import dayjs from 'dayjs'
import { Badge, cn, Container, Icon } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { hosts } from '@/api/constants'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

interface EventHistorySectionProps {
    userId?: string
}

export const EventHistorySection: React.FC<EventHistorySectionProps> = ({ userId }) => {
    const { t } = useTranslation()

    const { data, isLoading } = API.useUsersGetEventsQuery(userId!, { skip: !userId })

    if (isLoading) {
        return null
    }

    if (!data?.items?.length) {
        return (
            <Container>
                <p>{t('pages.profile.history-empty', 'Вы ещё не посещали мероприятий')}</p>
            </Container>
        )
    }

    return (
        <>
            {data.items.map((event) => {
                const itemTitle = t('pages.profile.history-item-title', 'Астровыезд - {{title}}', {
                    title: event.title
                })

                // The event date is stored/returned as UTC — compare against local
                // "now" to tell an already-happened trip from an upcoming one the
                // user has simply registered for.
                const isPastEvent = dayjs.utc(event.date).local().diff(dayjs()) <= 0

                return (
                    <Link
                        key={event.id}
                        href={`/stargazing/${event.id}`}
                        title={itemTitle}
                        className={styles.historyCard}
                    >
                        <div
                            className={cn(
                                styles.historyThumbnail,
                                !event.coverFileName && styles.historyThumbnailEmpty
                            )}
                        >
                            {event.coverFileName ? (
                                <Image
                                    alt={itemTitle}
                                    quality={70}
                                    width={120}
                                    height={90}
                                    src={`${hosts.stargazing}${event.id}/${event.coverFileName}_preview.${event.coverFileExt}`}
                                />
                            ) : (
                                <Icon
                                    name={'Moon'}
                                    aria-hidden
                                />
                            )}
                        </div>

                        <div className={styles.historyContent}>
                            <div className={styles.historyTitle}>{event.title}</div>
                            <div className={styles.historyMeta}>
                                {formatDate(event.date, 'D MMMM YYYY, dd • HH:mm')}
                            </div>
                            {event.location && <div className={styles.historyLocation}>{event.location}</div>}
                        </div>

                        <div className={styles.historyStatus}>
                            {isPastEvent && (
                                <Badge
                                    className={styles.historyVisitedBadge}
                                    icon={'CheckCircle'}
                                    label={t('pages.profile.history-visited', 'Посещено')}
                                    size={'small'}
                                />
                            )}
                            <Icon
                                className={styles.historyChevron}
                                name={'KeyboardRight'}
                                aria-hidden
                            />
                        </div>
                    </Link>
                )
            })}
        </>
    )
}
