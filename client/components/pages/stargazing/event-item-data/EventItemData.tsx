import React from 'react'
import Markdown from 'react-markdown'
import { Container, ContainerProps, Icon } from 'simple-react-ui-kit'

import Image from 'next/image'

import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { ShowMore } from '@/components/ui'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

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
        />

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

        <ShowMore>
            <Markdown>{event?.content}</Markdown>
        </ShowMore>
    </Container>
)
