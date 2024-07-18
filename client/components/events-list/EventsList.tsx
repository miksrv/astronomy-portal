import { ApiModel } from '@/api'
import React from 'react'

import EventsListItem from './EventsListItem'
import styles from './styles.module.sass'

interface EventsListProps {
    events?: ApiModel.Event[]
}

const EventsList: React.FC<EventsListProps> = ({ events }) => (
    <section className={styles.eventsList}>
        {events?.map((place) => (
            <EventsListItem
                key={place.id}
                event={place}
            />
        ))}
    </section>
)

export default EventsList
