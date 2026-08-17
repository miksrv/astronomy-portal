import React from 'react'
import { Container } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { EventsList } from '@/components/pages/stargazing'

import { EventHistorySectionSkeleton } from './EventHistorySectionSkeleton'

interface EventHistorySectionProps {
    userId?: string
}

export const EventHistorySection: React.FC<EventHistorySectionProps> = ({ userId }) => {
    const { t } = useTranslation()

    const { data, isLoading } = API.useEventGetListQuery({ userId }, { skip: !userId })

    if (isLoading) {
        return <EventHistorySectionSkeleton />
    }

    if (!data?.items?.length) {
        return (
            <Container>
                <p>{t('pages.profile.history-empty', 'Вы ещё не посещали мероприятий')}</p>
            </Container>
        )
    }

    // Same cards as the public /stargazing / /stargazing/history lists —
    // just pre-filtered server-side to this user's own attended events.
    return <EventsList events={data.items} />
}
