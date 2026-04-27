import React from 'react'
import { Container } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

interface EventHistorySectionProps {
    userId: string
}

export const EventHistorySection: React.FC<EventHistorySectionProps> = ({ userId }) => {
    const { t } = useTranslation()

    const { data, isLoading } = API.useUsersGetEventsQuery(userId)

    if (isLoading) {
        return null
    }

    if (!data?.items?.length) {
        return (
            <Container>
                <p>{t('pages.profile.history-empty', 'Вы ещё не посещали мероприятий')}</p>
            </Container>
        )
    }

    return (
        <Container>
            <table className={styles.historyTable}>
                <tbody>
                    {data.items.map((event) => (
                        <tr key={event.id}>
                            <td>
                                <Link href={`/stargazing/${event.id}`}>{event.title}</Link>
                            </td>
                            <td>{formatDate(event.date)}</td>
                            <td>
                                {t(
                                    'components.pages.stargazing.event-upcoming.members',
                                    'Взрослых: {{adults}}, детей: {{children}}',
                                    {
                                        adults: event.adults,
                                        children: event.children
                                    }
                                )}
                            </td>
                            <td>
                                {event.checkinAt && (
                                    <span className={styles.checkinBadge}>
                                        {t('pages.profile.history-checkin', 'Отмечен')}
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Container>
    )
}
