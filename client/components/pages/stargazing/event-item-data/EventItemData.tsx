import React from 'react'
import Markdown from 'react-markdown'
import { Container, ContainerProps } from 'simple-react-ui-kit'

import Image from 'next/image'

import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { ShowMore } from '@/components/ui'

import { EventInfoPanel } from '../event-info-panel'

import styles from './styles.module.sass'

interface EventItemDataProps extends ContainerProps {
    title?: string
    event?: ApiModel.Event
}

export const EventItemData: React.FC<EventItemDataProps> = ({ title, event, ...props }) => (
    <>
        <div className={styles.grid}>
            <Container
                {...props}
                className={styles.media}
            >
                <Image
                    style={{}}
                    width={1200}
                    height={630}
                    src={`${hosts.stargazing}${event?.id}/${event?.coverFileName}.${event?.coverFileExt}`}
                    alt={title || ''}
                    priority
                />
            </Container>

            <Container {...props}>
                <EventInfoPanel event={event} />
            </Container>
        </div>

        <Container>
            <ShowMore content={<Markdown>{event?.content}</Markdown>} />
        </Container>
    </>
)
