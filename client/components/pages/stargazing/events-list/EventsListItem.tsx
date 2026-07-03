import React from 'react'
import { Container } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { ApiModel, useAppSelector } from '@/api'
import { hosts } from '@/api/constants'

import { EventMetaRow } from '../event-meta-row'

import styles from './styles.module.sass'

interface EventsListItemProps {
    event: ApiModel.Event
}

export const EventsListItem: React.FC<EventsListItemProps> = ({ event }) => {
    const { t } = useTranslation()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const canViewStatistic = userRole === ApiModel.UserRole.ADMIN || userRole === ApiModel.UserRole.MODERATOR

    const itemTitle = t('components.pages.stargazing.events-list.item-title', 'Астровыезд - {{title}}', {
        title: event.title
    })

    return (
        <Container className={styles.eventListItem}>
            <div className={styles.photoSection}>
                <Link
                    href={`/stargazing/${event.id}`}
                    title={itemTitle}
                >
                    {event.coverFileName && (
                        <Image
                            className={styles.photo}
                            alt={itemTitle}
                            quality={70}
                            height={240}
                            width={370}
                            src={`${hosts.stargazing}${event.id}/${event.coverFileName}_preview.${event.coverFileExt}`}
                        />
                    )}
                </Link>
            </div>

            <div className={styles.bottomPanel}>
                <h3 className={styles.title}>
                    <Link
                        href={`/stargazing/${event.id}`}
                        title={itemTitle}
                    >
                        {event.title}
                    </Link>
                </h3>

                <EventMetaRow
                    date={event?.date?.date}
                    views={event?.views}
                    membersCount={event?.members?.total || event?.availableTickets}
                    statisticHref={canViewStatistic ? `/stargazing/${event.id}/statistic` : undefined}
                />
            </div>
        </Container>
    )
}
