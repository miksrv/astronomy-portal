import { ApiModel, HOST_IMG } from '@/api'
import { formatDate } from '@/functions/helpers'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Container } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

interface EventsListItemProps {
    event: ApiModel.Event
}

const EventsListItem: React.FC<EventsListItemProps> = ({ event }) => (
    <Container className={styles.eventListItem}>
        <div className={styles.photoSection}>
            <Link
                href={`/stargazing/${event.id}`}
                title={`Астровыезд - ${event.title}`}
            >
                {event.cover && (
                    <Image
                        className={styles.photo}
                        alt={`Астровыезд - ${event.title}`}
                        quality={70}
                        height={240}
                        width={370}
                        src={`${HOST_IMG}stargazing/${event.cover}`}
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

            <div className={styles.date}>
                {formatDate(event?.date?.date, 'D MMMM YYYY')}
            </div>
        </div>
    </Container>
)

export default EventsListItem
