import React, { useEffect, useState } from 'react'
import { Button, Message, Spinner } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'

import styles from './styles.module.sass'

interface EventTicketProps {
    /** Booking id (events_users.id) whose ticket should be rendered. */
    bookingId?: string
}

/**
 * Fetches the server-rendered PNG ticket as a blob (authorized request) and
 * displays it with a download button. The image is never persisted on the
 * server — it is generated on the fly per request.
 */
export const EventTicket: React.FC<EventTicketProps> = ({ bookingId }) => {
    const { t } = useTranslation()

    const { data: blob, isLoading, isError } = API.useEventGetTicketQuery(bookingId as string, { skip: !bookingId })

    const [url, setUrl] = useState<string>()

    useEffect(() => {
        if (!blob) {
            return
        }

        const objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)

        return () => URL.revokeObjectURL(objectUrl)
    }, [blob])

    if (isLoading || (!url && !isError)) {
        return (
            <div className={styles.ticketLoader}>
                <Spinner />
            </div>
        )
    }

    if (isError || !url) {
        return (
            <Message type={'error'}>
                {t('components.pages.stargazing.event-ticket.error', 'Не удалось загрузить билет')}
            </Message>
        )
    }

    return (
        <div className={styles.ticket}>
            {/* eslint-disable-next-line next/no-img-element -- blob object URL can't use next/image */}
            <img
                className={styles.ticketImage}
                src={url}
                alt={t('components.pages.stargazing.event-ticket.alt', 'Билет на астровыезд')}
            />

            <a
                className={styles.downloadLink}
                href={url}
                download={`ticket-${bookingId}.png`}
            >
                <Button
                    mode={'primary'}
                    size={'medium'}
                >
                    {t('components.pages.stargazing.event-ticket.download', 'Скачать билет')}
                </Button>
            </a>
        </div>
    )
}
