import React, { useEffect, useRef, useState } from 'react'
import { getCookie } from 'cookies-next'
import { Button, Container, Message, Spinner } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, ApiType, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { EventTicket } from '@/components/pages/stargazing/event-ticket'
import { STARGAZING_RETRY_STORAGE_KEY } from '@/utils/constants'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 5

type PaymentViewStatus = 'loading' | 'paid' | 'pending' | 'failed' | 'canceled' | 'error'

const StargazingPaymentPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const router = useRouter()

    const orderId = typeof router.query.orderId === 'string' ? router.query.orderId : undefined

    const [status, setStatus] = useState<PaymentViewStatus>('loading')
    const [pollExhausted, setPollExhausted] = useState<boolean>(false)
    const [bookingId, setBookingId] = useState<string>()
    const [failureReason, setFailureReason] = useState<string>()
    const [retryError, setRetryError] = useState<string>()
    const [checkPaymentStatus] = API.useEventPaymentStatusMutation()
    const [retryBooking, { isLoading: isRetrying }] = API.useEventsRegistrationPostMutation()
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    const canRetry = typeof window !== 'undefined' && !!sessionStorage.getItem(STARGAZING_RETRY_STORAGE_KEY)

    const handleRetry = async () => {
        const stored = sessionStorage.getItem(STARGAZING_RETRY_STORAGE_KEY)

        if (!stored) {
            return
        }

        setRetryError(undefined)

        try {
            const request = JSON.parse(stored) as ApiType.Events.ReqRegistration
            const data = (await retryBooking(request).unwrap()) as ApiType.Events.ResRegistration

            if (data.payment?.formUrl) {
                // Refresh the stored attempt in case this new order gets declined too.
                sessionStorage.setItem(STARGAZING_RETRY_STORAGE_KEY, JSON.stringify(request))
                window.location.href = data.payment.formUrl
                return
            }

            // Free event (ticket price dropped to 0 since the original attempt) — nothing left to pay.
            sessionStorage.removeItem(STARGAZING_RETRY_STORAGE_KEY)

            if (data.bookingId) {
                setBookingId(data.bookingId)
            }

            setStatus('paid')
        } catch (e) {
            setRetryError(
                (e as { data?: ApiType.ResError })?.data?.messages?.error ||
                    t('pages.payment.retry-error', 'Не удалось создать новую попытку оплаты. Попробуйте позже.')
            )
        }
    }

    useEffect(() => {
        if (!router.isReady) {
            return
        }

        if (!orderId) {
            setStatus('error')
            return
        }

        let cancelled = false
        let attempts = 0

        const poll = async () => {
            attempts += 1

            try {
                const result = await checkPaymentStatus({ orderId }).unwrap()

                if (cancelled) {
                    return
                }

                if (result.bookingId) {
                    setBookingId(result.bookingId)
                }

                if (result.status === 'paid') {
                    sessionStorage.removeItem(STARGAZING_RETRY_STORAGE_KEY)
                    setStatus('paid')
                    return
                }

                if (result.status === 'failed' || result.status === 'canceled') {
                    setStatus(result.status)
                    setFailureReason(result.errorMessage)
                    return
                }

                // Still pending — the bank callback may arrive with a delay, keep polling.
                setStatus('pending')

                if (attempts < MAX_POLL_ATTEMPTS) {
                    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
                } else {
                    // Don't leave the user on an endless spinner — surface a notice.
                    setPollExhausted(true)
                }
            } catch {
                if (!cancelled) {
                    setStatus('error')
                }
            }
        }

        void poll()

        return () => {
            cancelled = true

            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
        }
    }, [router.isReady, orderId])

    const pageTitle = t('pages.payment.title', 'Оплата участия')

    return (
        <AppLayout
            title={pageTitle}
            noindex={true}
            nofollow={true}
        >
            <AppToolbar
                title={pageTitle}
                currentPage={pageTitle}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', 'Астровыезды')
                    }
                ]}
            />

            <Container>
                {(status === 'loading' || (status === 'pending' && !pollExhausted)) && (
                    <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Spinner style={{ width: 32, height: 32 }} />
                        <p>{t('pages.payment.checking', 'Проверяем статус оплаты, пожалуйста, подождите…')}</p>
                    </div>
                )}

                {status === 'pending' && pollExhausted && (
                    <>
                        <Message
                            type={'warning'}
                            title={t('pages.payment.pending-title', 'Оплата ещё обрабатывается')}
                        >
                            <p>
                                {t(
                                    'pages.payment.pending-timeout',
                                    'Мы пока не получили подтверждение оплаты. Если вы оплатили — место удерживается, статус обновится в течение нескольких минут. Если оплата не завершена — вернитесь к мероприятию и завершите её.'
                                )}
                            </p>
                        </Message>
                        <Button
                            mode={'secondary'}
                            onClick={() => router.push('/stargazing')}
                        >
                            {t('pages.payment.back-to-stargazing', 'Вернуться к астровыездам')}
                        </Button>
                    </>
                )}

                {status === 'paid' && (
                    <>
                        <Message
                            type={'success'}
                            title={t('pages.payment.success-title', 'Оплата прошла успешно')}
                        >
                            <p>
                                {t(
                                    'pages.payment.success-text',
                                    'Вы зарегистрированы на астровыезд. Билет с QR-кодом доступен для скачивания.'
                                )}
                            </p>
                        </Message>

                        {bookingId && (
                            <div style={{ margin: '16px 0' }}>
                                <EventTicket bookingId={bookingId} />
                            </div>
                        )}

                        <Button
                            mode={'primary'}
                            variant={'positive'}
                            stretched={true}
                            onClick={() => router.push('/stargazing/entry')}
                        >
                            {t('pages.payment.to-ticket', 'Открыть билет')}
                        </Button>
                    </>
                )}

                {(status === 'failed' || status === 'canceled' || status === 'error') && (
                    <>
                        <Message
                            type={'error'}
                            title={t('pages.payment.failed-title', 'Оплата не прошла')}
                        >
                            <p>
                                {t(
                                    'pages.payment.failed-text',
                                    'Платёж не был завершён. Бронирование не подтверждено — вы можете попробовать зарегистрироваться снова.'
                                )}
                            </p>
                        </Message>

                        <p style={{ margin: '16px 0', textAlign: 'center' }}>
                            {failureReason ??
                                t(
                                    'pages.payment.failed-reason-fallback',
                                    'Банк не указал причину отказа. Попробуйте использовать другую карту или обратитесь в банк, выпустивший карту.'
                                )}
                        </p>

                        {retryError && (
                            <Message
                                type={'error'}
                                title={t('pages.payment.retry-error-title', 'Не удалось создать новую попытку')}
                            >
                                <p>{retryError}</p>
                            </Message>
                        )}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            {canRetry && (
                                <Button
                                    mode={'primary'}
                                    variant={'positive'}
                                    loading={isRetrying}
                                    disabled={isRetrying}
                                    onClick={handleRetry}
                                >
                                    {t('pages.payment.retry', 'Попробовать снова')}
                                </Button>
                            )}

                            <Button
                                mode={'secondary'}
                                onClick={() => router.push('/stargazing')}
                            >
                                {t('pages.payment.back-to-stargazing', 'Вернуться к астровыездам')}
                            </Button>
                        </div>
                    </>
                )}
            </Container>

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

            if (token) {
                store.dispatch(setSSRToken(token))
            } else {
                return { redirect: { destination: '/stargazing', permanent: false } }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default StargazingPaymentPage
