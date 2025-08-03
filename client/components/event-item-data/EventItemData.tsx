import React from 'react'
import Markdown from 'react-markdown'
import { Container, ContainerProps, Icon } from 'simple-react-ui-kit'

import Image from 'next/image'

import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import ShowMore from '@/components/show-more'
import { formatDate } from '@/tools/helpers'

import styles from './styles.module.sass'

interface EventItemDataProps extends ContainerProps {
    title?: string
    event?: ApiModel.Event
}

const EventItemData: React.FC<EventItemDataProps> = ({ title, event, ...props }) => (
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

            {!!event?.members?.total && event?.members?.total > 0 && (
                <div>
                    <Icon name={'Users'} />
                    {event?.members?.total}
                </div>
            )}
        </div>

        <ShowMore>
            <Markdown>{event?.content}</Markdown>
        </ShowMore>
    </Container>
)

export default EventItemData
