import React from 'react'

import { ApiModel } from '@/api'

import { EventsListItem } from './EventsListItem'

import styles from './styles.module.sass'

interface EventsListProps {
    events?: ApiModel.Event[]
}

export const EventsList: React.FC<EventsListProps> = ({ events }) => (
    <div className={styles.eventsList}>
        {events?.map((place) => (
            <EventsListItem
                key={place.id}
                event={place}
            />
        ))}
    </div>
)
