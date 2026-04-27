import React from 'react'
import { Button, Container } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { formatUTCDate } from '@/utils/dates'

import styles from './styles.module.sass'

interface UpcomingEventCardProps {
    event: ApiModel.Event
}

export const UpcomingEventCard: React.FC<UpcomingEventCardProps> = ({ event }) => {
    const { t } = useTranslation()

    const [cancelRegistration, { isLoading }] = API.useEventsCancelRegistrationPostMutation()

    const handleCancel = async () => {
        try {
            await cancelRegistration({ eventId: event.id }).unwrap()
        } catch {
            // silently handle; cache invalidation triggers re-fetch
        }
    }

    return (
        <Container>
            <div className={styles.upcomingEventCard}>
                {event.coverFileName && event.coverFileExt && (
                    <Image
                        className={styles.coverImage}
                        src={`${hosts.stargazing}${event.id}/${event.coverFileName}.${event.coverFileExt}`}
                        alt={event.title}
                        width={800}
                        height={400}
                    />
                )}

                <div className={styles.eventMeta}>
                    <h3>
                        <Link href={`/stargazing/${event.id}`}>{event.title}</Link>
                    </h3>

                    {event.date?.date && <p>{formatUTCDate(event.date.date, 'D MMMM YYYY, H:mm')}</p>}

                    {event.members && (
                        <p>
                            {t(
                                'components.pages.stargazing.event-upcoming.members',
                                'Взрослых: {{adults}}, детей: {{children}}',
                                {
                                    adults: event.members.adults,
                                    children: event.members.children
                                }
                            )}
                        </p>
                    )}

                    {(event.yandexMap || event.googleMap) && (
                        <ul className={styles.mapLinks}>
                            {event.yandexMap && (
                                <li>
                                    <Link
                                        href={event.yandexMap}
                                        target={'_blank'}
                                        rel={'noreferrer'}
                                        title={t(
                                            'components.pages.stargazing.event-upcoming.yandex-maps-title',
                                            'Ссылка на Яндекс Картах'
                                        )}
                                    >
                                        {t('components.pages.stargazing.event-upcoming.yandex-maps', 'Яндекс Карты')}
                                    </Link>
                                </li>
                            )}
                            {event.googleMap && (
                                <li>
                                    <Link
                                        href={event.googleMap}
                                        target={'_blank'}
                                        rel={'noreferrer'}
                                        title={t(
                                            'components.pages.stargazing.event-upcoming.google-maps-title',
                                            'Ссылка на Google Картах'
                                        )}
                                    >
                                        {t('components.pages.stargazing.event-upcoming.google-maps', 'Google Карты')}
                                    </Link>
                                </li>
                            )}
                        </ul>
                    )}

                    <Button
                        mode={'secondary'}
                        size={'medium'}
                        loading={isLoading}
                        disabled={isLoading}
                        onClick={handleCancel}
                    >
                        {t('components.pages.stargazing.event-upcoming.cancel-booking', 'Отменить бронирование')}
                    </Button>
                </div>
            </div>
        </Container>
    )
}
