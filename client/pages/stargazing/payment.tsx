import React, { useEffect, useRef, useState } from 'react'
import { getCookie } from 'cookies-next'
import { Button, Container, Message, Spinner } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'
import { generateNextSeo } from 'next-seo/pages'

import { API, ApiType, setLocale, SITE_LINK, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { useEventBookingSubmit } from '@/components/pages/stargazing/event-upcoming/useEventBookingSubmit'
import { STARGAZING_RETRY_STORAGE_KEY } from '@/utils/constants'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 5

type PaymentViewStatus = 'loading' | 'redirecting' | 'pending' | 'failed' | 'canceled' | 'error'

const StargazingPaymentPage: NextPage<object> = () => {
    const { t, i18n } = useTranslation()
    const router = useRouter()

    const orderId = typeof router.query.orderId === 'string' ? router.query.orderId : undefined

    const [status, setStatus] = useState<PaymentViewStatus>('loading')
    const [pollExhausted, setPollExhausted] = useState<boolean>(false)
    const [failureReason, setFailureReason] = useState<string>()
    const [checkPaymentStatus] = API.useEventPaymentStatusMutation()
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    // Mirrors "is an API request for this page currently in flight" - navigation
    // is only blocked for the duration of that request, never while idle between
    // polls or after a final status is known.
    const isBusyRef = useRef<boolean>(true)

    const {
        submit: retrySubmit,
        isLoading: isRetrying,
        isError: isRetryError,
        errorMessage: retryErrorMessage
    } = useEventBookingSubmit()

    const canRetry = typeof window !== 'undefined' && !!sessionStorage.getItem(STARGAZING_RETRY_STORAGE_KEY)

    const handleRetry = async () => {
        const stored = sessionStorage.getItem(STARGAZING_RETRY_STORAGE_KEY)

        if (!stored) {
            return
        }

        const request = JSON.parse(stored) as ApiType.Events.ReqRegistration

        isBusyRef.current = true

        try {
            const result = await retrySubmit(request)

            // A formUrl means submit() already redirected to the bank for a new order.
            // Otherwise the event turned out free (ticket price dropped since the
            // original attempt) - nothing left to pay, send the user to their ticket.
            if (result && !result.redirectedToPayment) {
                setStatus('redirecting')
                void router.push('/profile#upcoming-event')
            }
        } finally {
            isBusyRef.current = false
        }
    }

    // Block navigating away (in-app routing and tab close/refresh) while a
    // payment-status request is actually in flight, so a poll response never
    // gets lost mid-flight.
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isBusyRef.current) {
                event.preventDefault()
                event.returnValue = ''
            }
        }

        const handleRouteChangeStart = () => {
            if (!isBusyRef.current) {
                return
            }

            const confirmed = window.confirm(
                t('pages.payment.leave-confirm', 'Проверка оплаты ещё не завершена. Уйти со страницы?')
            )

            if (!confirmed) {
                router.events.emit('routeChangeError')
                throw 'routeChange aborted (payment check in progress)'
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        router.events.on('routeChangeStart', handleRouteChangeStart)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            router.events.off('routeChangeStart', handleRouteChangeStart)
        }
    }, [router, t])

    useEffect(() => {
        if (!router.isReady) {
            return
        }

        if (!orderId) {
            isBusyRef.current = false
            setStatus('error')
            return
        }

        let cancelled = false
        let attempts = 0

        const poll = async () => {
            attempts += 1
            isBusyRef.current = true

            try {
                const result = await checkPaymentStatus({ orderId }).unwrap()

                if (cancelled) {
                    return
                }

                if (result.status === 'paid') {
                    sessionStorage.removeItem(STARGAZING_RETRY_STORAGE_KEY)
                    isBusyRef.current = false
                    setStatus('redirecting')
                    void router.push('/profile#upcoming-event')
                    return
                }

                if (result.status === 'failed' || result.status === 'canceled') {
                    isBusyRef.current = false
                    setStatus(result.status)
                    setFailureReason(result.errorMessage)
                    return
                }

                // Still pending - the bank callback may arrive with a delay, keep polling.
                setStatus('pending')
                isBusyRef.current = false

                if (attempts < MAX_POLL_ATTEMPTS) {
                    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
                } else {
                    // Don't leave the user on an endless spinner - surface a notice.
                    setPollExhausted(true)
                }
            } catch (err) {
                if (cancelled) {
                    return
                }

                isBusyRef.current = false

                // Someone else's payment - the server rejected the ownership check.
                // No error shown, just quietly send the user back to their own account.
                if ((err as ApiType.ResError)?.status === 403) {
                    void router.replace('/profile')
                    return
                }

                setStatus('error')
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

    const pageTitle = t('pages.payment.title', 'Пожалуйста, подождите')

    return (
        <>
            <Head>
                {generateNextSeo({
                    nofollow: true,
                    noindex: true,
                    canonical: `${SITE_LINK}${i18n.language === 'en' ? 'en/' : ''}stargazing/payment`,
                    title: pageTitle
                })}
            </Head>
            <div className={'centerPageContainer'}>
                <div className={'wrapper'}>
                    <Container>
                        <h1 className={'header'}>{pageTitle}</h1>

                        {(status === 'loading' ||
                            status === 'redirecting' ||
                            (status === 'pending' && !pollExhausted)) && (
                            <div className={'loaderWrapper'}>
                                <Spinner />
                            </div>
                        )}

                        {(status === 'loading' || (status === 'pending' && !pollExhausted)) && (
                            <p className={'description'}>
                                {t('pages.payment.checking', 'Проверяем статус оплаты, пожалуйста, подождите…')}
                            </p>
                        )}

                        {status === 'redirecting' && (
                            <p className={'description'}>
                                {t('pages.payment.redirecting', 'Оплата прошла успешно! Переходим в личный кабинет…')}
                            </p>
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
                                <br />
                                <Button
                                    stretched={true}
                                    mode={'secondary'}
                                    onClick={() => router.push('/stargazing')}
                                >
                                    {t('pages.payment.back-to-stargazing', 'Вернуться к астровыездам')}
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

                                <p className={'description'}>
                                    {failureReason ??
                                        t(
                                            'pages.payment.failed-reason-fallback',
                                            'Банк не указал причину отказа. Попробуйте использовать другую карту или обратитесь в банк, выпустивший карту.'
                                        )}
                                </p>

                                {isRetryError && (
                                    <Message
                                        type={'error'}
                                        title={t('pages.payment.retry-error-title', 'Не удалось создать новую попытку')}
                                    >
                                        <p>
                                            {retryErrorMessage ||
                                                t(
                                                    'pages.payment.retry-error',
                                                    'Не удалось создать новую попытку оплаты. Попробуйте позже.'
                                                )}
                                        </p>
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
                </div>
            </div>
        </>
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
