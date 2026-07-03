import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import { useEventStatisticRefresh } from './useEventStatisticRefresh'

interface EventStatisticRefreshInfoProps {
    eventId: string
}

/** Live "last updated / next update" line for the toolbar, shown only while registration is still open. */
export const EventStatisticRefreshInfo: React.FC<EventStatisticRefreshInfoProps> = ({ eventId }) => {
    const { t } = useTranslation()

    const { registrationOpen, updatedLabel, nextUpdateLabel } = useEventStatisticRefresh(eventId)

    if (!registrationOpen || !updatedLabel) {
        return null
    }

    return (
        <>
            {t('pages.stargazing.statistic-updated', 'Обновлено')}: <strong>{updatedLabel}</strong>
            {' · '}
            {t('pages.stargazing.statistic-next-update', 'Следующее обновление через')}:{' '}
            <strong>{nextUpdateLabel}</strong>
        </>
    )
}
