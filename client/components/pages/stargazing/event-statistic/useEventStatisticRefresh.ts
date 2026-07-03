import { useEffect, useState } from 'react'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { formatDate, getHumanTimeFromSec, getSecondsUntilUTCDate } from '@/utils/dates'

const POLL_INTERVAL_MS = 15000

/**
 * Drives the live "last updated / next update" indicator on the event
 * statistic page. Polling (and the indicator itself) only runs while the
 * event's registration window is still open — once registrationEnd has
 * passed the numbers are final, so there is nothing to refresh.
 */
export const useEventStatisticRefresh = (eventId: string) => {
    const { t } = useTranslation()

    const [, forceTick] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => forceTick((prev) => prev + 1), 1000)
        return () => clearInterval(interval)
    }, [])

    const { data: event } = API.useEventGetItemQuery(eventId, { skip: !eventId })

    const secondsUntilRegistrationEnd = getSecondsUntilUTCDate(event?.registrationEnd?.date)
    const registrationOpen = typeof secondsUntilRegistrationEnd === 'number' && secondsUntilRegistrationEnd > 0

    const { fulfilledTimeStamp } = API.useEventGetStatisticQuery(eventId, {
        skip: !eventId,
        pollingInterval: registrationOpen ? POLL_INTERVAL_MS : undefined
    })

    if (!registrationOpen || !fulfilledTimeStamp) {
        return { registrationOpen, updatedLabel: undefined, nextUpdateLabel: undefined }
    }

    const secondsSinceUpdate = Math.max(0, Math.round((Date.now() - fulfilledTimeStamp) / 1000))
    const secondsUntilNextUpdate = Math.max(0, Math.round(POLL_INTERVAL_MS / 1000) - secondsSinceUpdate)

    return {
        registrationOpen,
        updatedLabel: formatDate(new Date(fulfilledTimeStamp), 'HH:mm:ss'),
        nextUpdateLabel: getHumanTimeFromSec(secondsUntilNextUpdate, t)
    }
}
