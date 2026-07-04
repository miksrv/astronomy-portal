import React from 'react'
import Markdown from 'react-markdown'
import { Container, ContainerProps } from 'simple-react-ui-kit'

import Image from 'next/image'

import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { ShowMore } from '@/components/ui'

import { EventMetaRow } from '../event-meta-row'

interface EventItemDataProps extends ContainerProps {
    title?: string
    event?: ApiModel.Event
}

export const EventItemData: React.FC<EventItemDataProps> = ({ title, event, ...props }) => (
    <Container {...props}>
        <Image
            style={{
                objectFit: 'cover',
                height: 'auto',
                width: '100%'
            }}
            src={`${hosts.stargazing}${event?.id}/${event?.coverFileName}.${event?.coverFileExt}`}
            alt={title || ''}
            width={1024}
            height={768}
            priority
        />

        <EventMetaRow
            date={event?.date?.date}
            views={event?.views}
            membersCount={event?.members?.total || event?.availableTickets}
        />

        <ShowMore content={<Markdown>{event?.content}</Markdown>} />
    </Container>
)
