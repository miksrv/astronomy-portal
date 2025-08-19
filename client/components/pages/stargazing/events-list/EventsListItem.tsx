import React from 'react'
import { Container, Icon } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'

import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

interface EventsListItemProps {
    event: ApiModel.Event
}

export const EventsListItem: React.FC<EventsListItemProps> = ({ event }) => (
    <Container className={styles.eventListItem}>
        <div className={styles.photoSection}>
            <Link
                href={`/stargazing/${event.id}`}
                title={`Астровыезд - ${event.title}`}
            >
                {event.coverFileName && (
                    <Image
                        className={styles.photo}
                        alt={`Астровыезд - ${event.title}`}
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
                    title={`Астровыезд - ${event.title}`}
                >
                    {event.title}
                </Link>
            </h3>

            <div className={styles.toolbar}>
                <div>
                    <Icon name={'Time'} />
                    {formatDate(event?.date?.date, 'D MMMM YYYY')}
                </div>

                <div>
                    <Icon name={'Eye'} />
                    {event?.views}
                </div>

                <div>
                    <Icon name={'Users'} />
                    {event?.members?.total || event?.availableTickets}
                </div>
            </div>
        </div>
    </Container>
)
