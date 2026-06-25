import React, { useEffect, useRef, useState } from 'react'
import { getCookie } from 'cookies-next'
import { Button, Container, Message, Spinner } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { EventTicket } from '@/components/pages/stargazing/event-ticket'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 5

type PaymentViewStatus = 'loading' | 'paid' | 'pending' | 'failed' | 'canceled' | 'error'

const StargazingPaymentPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const router = useRouter()

    const orderId = typeof router.query.orderId === 'string' ? router.query.orderId : undefined

    const [status, setStatus] = useState<PaymentViewStatus>('loading')
    const [bookingId, setBookingId] = useState<string>()
    const [checkPaymentStatus] = API.useEventPaymentStatusMutation()
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
                    setStatus('paid')
                    return
                }

                if (result.status === 'failed' || result.status === 'canceled') {
                    setStatus(result.status)
                    return
                }

                // Still pending — the bank callback may arrive with a delay, keep polling.
                setStatus('pending')

                if (attempts < MAX_POLL_ATTEMPTS) {
                    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
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
                {(status === 'loading' || status === 'pending') && (
                    <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Spinner />
                        <p>{t('pages.payment.checking', 'Проверяем статус оплаты, пожалуйста, подождите…')}</p>
                    </div>
                )}

                {status === 'paid' && (
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

                        {bookingId && (
                            <div style={{ margin: '16px 0' }}>
                                <EventTicket bookingId={bookingId} />
                            </div>
                        )}

                        <Button
                            mode={'primary'}
                            variant={'positive'}
                            onClick={() => router.push('/stargazing/entry')}
                        >
                            {t('pages.payment.to-ticket', 'Открыть билет')}
                        </Button>
                    </Message>
                )}

                {(status === 'failed' || status === 'canceled' || status === 'error') && (
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
                        <Button
                            mode={'secondary'}
                            onClick={() => router.push('/stargazing')}
                        >
                            {t('pages.payment.back-to-stargazing', 'Вернуться к астровыездам')}
                        </Button>
                    </Message>
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
