import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, useAppDispatch } from '@/api'
import { getHumanTimeFromSec, getSecondsUntilUTCDate } from '@/utils/dates'

/**
 * Derives the booking/payment state machine for the upcoming event from raw
 * server fields (bookingStatus, payment.expiresInSeconds, registration window),
 * and owns the effects that keep it live: the 1s countdown tick, refetching on
 * bfcache restore (bank back-button), and refetching once a payment hold expires.
 */
export const useEventBookingStatus = (event?: ApiModel.Event) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()

    const [registered, setRegistered] = useState<boolean>(false)
    const [bookedId, setBookedId] = useState<string>()
    const [tick, setTick] = useState<number>(0)
    const [paymentExpiryTs, setPaymentExpiryTs] = useState<number>()

    const [checkPaymentStatus, { isLoading: isVerifyingPayment }] = API.useEventPaymentStatusMutation()

    const expiredHandledRef = useRef<boolean>(false)
    const checkedOrderIdRef = useRef<string | undefined>(undefined)

    // Recomputed on every tick so countdown values update each second
    const secondsUntilRegistrationStart = getSecondsUntilUTCDate(event?.registrationStart?.date) || 0
    const secondsUntilRegistrationEnd = getSecondsUntilUTCDate(event?.registrationEnd?.date) || 0

    // A paid booking holds the seat as "pending" until its payment expires (~20 min).
    const pendingPayment = registered && event?.bookingStatus === 'pending' ? event?.payment : undefined

    // Seconds left on the payment hold, counted down locally against the absolute
    // target captured from the server's expiresInSeconds (recomputed each tick).
    const paymentSecondsLeft =
        pendingPayment && paymentExpiryTs !== undefined
            ? Math.max(0, Math.round((paymentExpiryTs - Date.now()) / 1000))
            : undefined

    const awaitingPayment = !!pendingPayment && (paymentSecondsLeft ?? 0) > 0

    // A booking shows ticket / QR / location only once it is actually
    // confirmed (paid or free) — explicitly, not just "not pending", since a
    // declined/expired payment attempt ('failed') is also not 'pending'.
    const isConfirmed = registered && event?.bookingStatus === 'confirmed'

    // A declined/expired payment attempt: the row is kept (not deleted) so
    // it can be retried with the same adults/children instead of re-filling
    // the form.
    const failedPayment = registered && event?.bookingStatus === 'failed'

    const paymentTimeLeftLabel = getHumanTimeFromSec(paymentSecondsLeft ?? 0, t)

    // Money was actually captured only once the booking is confirmed on a paid
    // event — cancelling an unpaid (pending) hold has nothing to refund.
    const isPaidConfirmedBooking = isConfirmed && !!event?.ticketPrice

    // Actively re-verifies a pending payment with the gateway (no bank webhook
    // is configured, so this — plus the bfcache re-check below — is the only
    // way a payment completed in a now-closed bank tab gets reconciled without
    // waiting for the seat-hold TTL to lapse). Guarded per orderId so it fires
    // once per mount/pageshow rather than on every countdown tick.
    const verifyPendingPayment = useCallback(
        (orderId: string) => {
            if (checkedOrderIdRef.current === orderId) {
                return
            }

            checkedOrderIdRef.current = orderId

            checkPaymentStatus({ orderId })
                .unwrap()
                .then((result) => {
                    if (result.status !== 'new' && result.status !== 'pending') {
                        dispatch(API.util.invalidateTags([{ id: 'UPCOMING', type: 'Events' }]))
                    }
                })
                .catch(() => {
                    checkedOrderIdRef.current = undefined
                })
        },
        [checkPaymentStatus, dispatch]
    )

    const registrationAvailable = useMemo(() => {
        if (event?.requiresRegistration === false) {
            return false
        }

        if (event?.availableTickets === 0) {
            return false
        }

        if (secondsUntilRegistrationStart >= 0) {
            return false
        }

        if (secondsUntilRegistrationEnd <= 0) {
            return false
        }

        return (getSecondsUntilUTCDate(event?.date?.date) || 0) > 0
    }, [event, secondsUntilRegistrationStart, secondsUntilRegistrationEnd, tick])

    useEffect(() => {
        setRegistered(event?.registered || false)
    }, [event?.registered])

    useEffect(() => {
        // Capture the payment deadline as an absolute client instant whenever the
        // server data changes, so the countdown survives re-renders and refetches.
        const secondsLeft = event?.bookingStatus === 'pending' ? event?.payment?.expiresInSeconds : undefined
        setPaymentExpiryTs(typeof secondsLeft === 'number' ? Date.now() + secondsLeft * 1000 : undefined)
    }, [event?.bookingStatus, event?.payment?.expiresInSeconds])

    useEffect(() => {
        const interval = setInterval(() => {
            setTick((prev) => prev + 1)
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        // Fires once whenever a pending payment first appears — covers both the
        // initial page load (booking already pending) and a freshly created one.
        if (pendingPayment?.orderId) {
            verifyPendingPayment(pendingPayment.orderId)
        }
    }, [pendingPayment?.orderId, verifyPendingPayment])

    useEffect(() => {
        // Returning via the browser "Back" button after the bank page restores
        // this page from the bfcache with stale data (the booking form). Refetch
        // the upcoming event on bfcache restore, and actively re-verify a still-
        // pending payment with the gateway rather than trusting the stale local
        // status.
        const handlePageShow = (e: PageTransitionEvent) => {
            if (e.persisted) {
                dispatch(API.util.invalidateTags([{ id: 'UPCOMING', type: 'Events' }]))

                if (pendingPayment?.orderId) {
                    checkedOrderIdRef.current = undefined
                    verifyPendingPayment(pendingPayment.orderId)
                }
            }
        }

        window.addEventListener('pageshow', handlePageShow)

        return () => window.removeEventListener('pageshow', handlePageShow)
    }, [dispatch, pendingPayment?.orderId, verifyPendingPayment])

    useEffect(() => {
        // When the payment hold lapses, refetch the upcoming event once: the
        // backend releases the expired booking on read, so the booking form
        // reappears instead of a dead "awaiting payment" panel.
        if (
            pendingPayment &&
            paymentSecondsLeft !== undefined &&
            paymentSecondsLeft <= 0 &&
            !expiredHandledRef.current
        ) {
            expiredHandledRef.current = true
            dispatch(API.util.invalidateTags([{ id: 'UPCOMING', type: 'Events' }]))
        }

        if (!pendingPayment) {
            expiredHandledRef.current = false
        }
    }, [pendingPayment, paymentSecondsLeft, dispatch])

    return {
        awaitingPayment,
        bookedId,
        failedPayment,
        isConfirmed,
        isPaidConfirmedBooking,
        isVerifyingPayment,
        paymentTimeLeftLabel,
        pendingPayment,
        registered,
        registrationAvailable,
        secondsUntilRegistrationEnd,
        secondsUntilRegistrationStart,
        setBookedId,
        setRegistered
    }
}
