import { useCallback } from 'react'

import { API, ApiType } from '@/api'
import { STARGAZING_RETRY_STORAGE_KEY } from '@/utils/constants'
import { getErrorMessage } from '@/utils/errors'

export interface EventBookingSubmitResult {
    bookingId?: string
    redirectedToPayment: boolean
}

/**
 * Wraps eventsRegistrationPost with the shared submit flow: paid events redirect
 * to the bank (stashing the request for a later retry), free events resolve with
 * a booking id. Used by the initial booking form and both retry-payment call sites.
 */
export const useEventBookingSubmit = () => {
    const [bookEvent, mutationState] = API.useEventsRegistrationPostMutation()

    const submit = useCallback(
        async (request: ApiType.Events.ReqRegistration): Promise<EventBookingSubmitResult | undefined> => {
            const result = await bookEvent(request)
            const data = result && 'data' in result ? (result.data as ApiType.Events.ResRegistration) : undefined

            if (!data) {
                return undefined
            }

            if (data.payment?.formUrl) {
                sessionStorage.setItem(STARGAZING_RETRY_STORAGE_KEY, JSON.stringify(request))
                window.location.href = data.payment.formUrl
                return { redirectedToPayment: true }
            }

            sessionStorage.removeItem(STARGAZING_RETRY_STORAGE_KEY)

            return { bookingId: data.bookingId, redirectedToPayment: false }
        },
        [bookEvent]
    )

    return {
        ...mutationState,
        errorMessage: getErrorMessage(mutationState.error),
        submit
    }
}
