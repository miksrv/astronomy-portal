import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Button, Container, Dialog, Icon, Spinner } from 'simple-react-ui-kit'

import Image from 'next/image'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, ApiType, useAppDispatch, useAppSelector } from '@/api'
import { hosts } from '@/api/constants'
import { LoginForm } from '@/components/common'
import { formatUTCDate, getHumanTimeFromSec, getLocalizedTimeFromSec, getSecondsUntilUTCDate } from '@/utils/dates'

import { EventTicket } from '../event-ticket'

import { EventBookingForm } from './event-booking-form'
import noEventsImage from './no-events.png'

import styles from './styles.module.sass'

interface EventUpcomingProps {
    event?: ApiModel.Event
}

export const EventUpcoming: React.FC<EventUpcomingProps> = ({ event: eventProp }) => {
    const { t } = useTranslation()

    const user = useAppSelector((state) => state.auth.user)

    const dispatch = useAppDispatch()

    // The page passes `event` as a plain SSR prop (getServerSideProps), which
    // never updates on its own. Subscribing to the same query here (RTK Query
    // reuses the SSR-hydrated cache entry, so this doesn't cause an extra
    // fetch) means a payment-status re-check that invalidates the 'UPCOMING'
    // tag actually refreshes what's rendered, instead of requiring a full
    // page reload to see the confirmed booking.
    const { data: eventData } = API.useEventGetUpcomingQuery()
    const event = eventData ?? eventProp

    const [registered, setRegistered] = useState<boolean>(false)
    const [bookedId, setBookedId] = useState<string>()
    const [confirmation, showConfirmation] = useState<boolean>(false)
    const [tick, setTick] = useState<number>(0)
    const [paymentExpiryTs, setPaymentExpiryTs] = useState<number>()

    const expiredHandledRef = useRef<boolean>(false)
    const checkedOrderIdRef = useRef<string | undefined>(undefined)

    const [cancelRegistration, { isLoading }] = API.useEventsCancelRegistrationPostMutation()
    const [retryBooking, { isLoading: isRetrying }] = API.useEventsRegistrationPostMutation()
    const [checkPaymentStatus, { isLoading: isVerifyingPayment }] = API.useEventPaymentStatusMutation()
    const [retryError, setRetryError] = useState<string>()

    const handleCancelRegistration = async () => {
        try {
            await cancelRegistration({ eventId: event?.id || '' }).unwrap()
            showConfirmation(false)
            setRegistered(false)
        } catch {
            showConfirmation(false)
        }
    }

    const handleRetryPayment = async () => {
        if (!event?.id) {
            return
        }

        setRetryError(undefined)

        try {
            const data = (await retryBooking({
                adults: event.members?.adults || 1,
                children: event.members?.children || 0,
                childrenAges: event.members?.childrenAges,
                eventId: event.id,
                name: user?.name,
                phone: user?.phone
            }).unwrap()) as ApiType.Events.ResRegistration

            if (data.payment?.formUrl) {
                window.location.href = data.payment.formUrl
            }
        } catch (e) {
            setRetryError(
                (e as { data?: ApiType.ResError })?.data?.messages?.error ||
                    t(
                        'components.pages.stargazing.event-upcoming.retry-payment-error',
                        'Не удалось создать новую попытку оплаты. Попробуйте позже.'
                    )
            )
        }
    }

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

    // Actively re-verifies a pending payment with the gateway. There is no bank
    // webhook configured, so if the visitor closes the bank tab after paying and
    // simply comes back to the site later (instead of following the bank's
    // redirect), this is the only way the booking gets reconciled before the
    // seat-hold TTL lapses. Guarded per orderId so it fires once per mount/
    // pageshow rather than on every countdown tick.
    const verifyPendingPayment = useCallback(
        (orderId: string) => {
            if (checkedOrderIdRef.current === orderId) {
                return
            }

            checkedOrderIdRef.current = orderId

            checkPaymentStatus({ orderId })
                .unwrap()
                .catch(() => {
                    // Allow a retry on the next mount/pageshow instead of getting stuck.
                    checkedOrderIdRef.current = undefined
                })
        },
        [checkPaymentStatus]
    )

    const registrationAvailable = useMemo(() => {
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
        // Fires once whenever a pending payment first appears — covers a direct/
        // repeat visit to the page with an already-pending booking, not just the
        // bank's own redirect back.
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

    if (!event) {
        return (
            <Container className={styles.noEvent}>
                <Image
                    className={styles.noEventImage}
                    src={noEventsImage}
                    alt={''}
                />
                <h3>
                    {t('components.pages.stargazing.event-upcoming.no-upcoming', 'Пока нет предстоящих астровыездов')}
                </h3>
                <p>
                    {t(
                        'components.pages.stargazing.event-upcoming.no-upcoming-hint',
                        'Как только мы запланируем следующий астровыезд - здесь появится форма регистрации.'
                    )}
                </p>
            </Container>
        )
    }

    return (
        <Container>
            <div className={styles.upcomingEvent}>
                <div className={styles.imageContainer}>
                    <Image
                        className={styles.blur}
                        src={`${hosts.stargazing}${event?.id}/${event?.coverFileName}.${event?.coverFileExt}`}
                        alt={''}
                        fill={true}
                    />

                    <Image
                        className={styles.image}
                        src={`${hosts.stargazing}${event?.id}/${event?.coverFileName}.${event?.coverFileExt}`}
                        alt={`${t('components.pages.stargazing.event-upcoming.stargazing', 'Астровыезды')}: ${event?.title}`}
                        width={1024}
                        height={768}
                    />
                </div>

                <div className={styles.stargazing}>
                    <h2 className={styles.title}>{event?.title}</h2>

                    {isConfirmed && (
                        <h3 className={styles.registeredTitle}>
                            {t('components.pages.stargazing.event-upcoming.you-are-registered', 'Вы зарегистрированы')}
                        </h3>
                    )}

                    {isConfirmed && (event?.bookedId || bookedId) && (
                        <div className={styles.ticketBlock}>
                            <EventTicket bookingId={event?.bookedId || bookedId} />
                        </div>
                    )}

                    {/* Paid booking awaiting payment — seat is held with a countdown. While a
                        pending payment is being actively re-verified with the gateway (on
                        mount and on bfcache restore — there is no bank webhook), show a
                        loader instead of the stale countdown/actions. */}
                    {awaitingPayment && pendingPayment && (
                        <div className={styles.infoBlock}>
                            {isVerifyingPayment ? (
                                <div className={styles.verifyingPayment}>
                                    <Spinner style={{ height: 20, width: 20 }} />
                                    {t(
                                        'components.pages.stargazing.event-upcoming.verifying-payment',
                                        'Проверяем статус оплаты…'
                                    )}
                                </div>
                            ) : (
                                <>
                                    <h3>
                                        {t(
                                            'components.pages.stargazing.event-upcoming.awaiting-payment-title',
                                            'Бронь ожидает оплаты'
                                        )}
                                    </h3>
                                    <p>
                                        {t(
                                            'components.pages.stargazing.event-upcoming.awaiting-payment-text',
                                            'Место забронировано. Завершите оплату до конца таймера, иначе бронь будет автоматически отменена и место освободится.'
                                        )}
                                    </p>
                                    <p>
                                        <strong>
                                            {t(
                                                'components.pages.stargazing.event-upcoming.payment-time-left',
                                                'Осталось на оплату: {{time}}',
                                                { time: paymentTimeLeftLabel }
                                            )}
                                        </strong>
                                    </p>
                                    <div className={styles.awaitingPaymentActions}>
                                        <Button
                                            mode={'primary'}
                                            variant={'positive'}
                                            onClick={() => {
                                                window.location.href = pendingPayment.formUrl
                                            }}
                                        >
                                            {t(
                                                'components.pages.stargazing.event-upcoming.return-to-payment',
                                                'Вернуться к оплате'
                                            )}
                                        </Button>
                                        <Button
                                            mode={'secondary'}
                                            variant={'negative'}
                                            loading={isLoading}
                                            disabled={isLoading}
                                            onClick={() => showConfirmation(true)}
                                        >
                                            {t(
                                                'components.pages.stargazing.event-upcoming.cancel-booking',
                                                'Отменить бронирование'
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Payment hold lapsed — refetch is triggered; show a brief notice meanwhile */}
                    {registered && event?.bookingStatus === 'pending' && !awaitingPayment && (
                        <div className={styles.infoBlock}>
                            <h3>
                                {t(
                                    'components.pages.stargazing.event-upcoming.payment-expired-title',
                                    'Время на оплату истекло'
                                )}
                            </h3>
                            <p>
                                {t(
                                    'components.pages.stargazing.event-upcoming.payment-expired-text',
                                    'Место освобождено. Обновите страницу, чтобы попробовать снова.'
                                )}
                            </p>
                        </div>
                    )}

                    {/* Payment declined or the hold already lapsed — the booking is kept (not
                        deleted) so retrying reuses it instead of re-filling the form. */}
                    {failedPayment && (
                        <div className={styles.infoBlock}>
                            <h3>
                                {t(
                                    'components.pages.stargazing.event-upcoming.payment-failed-title',
                                    'Оплата не прошла'
                                )}
                            </h3>
                            <p>
                                {t(
                                    'components.pages.stargazing.event-upcoming.payment-failed-text',
                                    'Предыдущая попытка оплаты не была завершена. Место не забронировано — вы можете попробовать оплатить снова.'
                                )}
                            </p>

                            {retryError && <p className={styles.notifyText}>{retryError}</p>}

                            <div className={styles.awaitingPaymentActions}>
                                <Button
                                    mode={'primary'}
                                    variant={'positive'}
                                    loading={isRetrying}
                                    disabled={isRetrying}
                                    onClick={handleRetryPayment}
                                >
                                    {t(
                                        'components.pages.stargazing.event-upcoming.retry-payment',
                                        'Попробовать оплатить снова'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className={styles.infoSection}>
                        <Icon
                            name={'Bell'}
                            className={styles.icon}
                        />
                        {formatUTCDate(event?.date?.date, 'D MMMM, YYYY')}
                    </div>

                    <div className={styles.infoSection}>
                        <Icon
                            name={'Time'}
                            className={styles.icon}
                        />
                        {formatUTCDate(event?.date?.date, 'H:mm')}{' '}
                        <span
                            className={styles.notifyText}
                            style={{ marginTop: 3 }}
                        >
                            {t('components.pages.stargazing.event-upcoming.timezone', '(Оренбургское время, UTC+5)')}
                        </span>
                    </div>

                    {isConfirmed && (
                        <div className={styles.infoSection}>
                            <Icon
                                name={'Tag'}
                                className={styles.icon}
                            />
                            <div>
                                <a
                                    href={'/stargazing/entry/'}
                                    title={t(
                                        'components.pages.stargazing.event-upcoming.download-qr-title',
                                        'Скачать QR-код для входа на мероприятие'
                                    )}
                                    target={'_blank'}
                                    rel={'noreferrer'}
                                >
                                    {t(
                                        'components.pages.stargazing.event-upcoming.download-qr',
                                        'Скачать QR-код для входа на мероприятие'
                                    )}
                                </a>
                                <div className={styles.notifyText}>
                                    {t(
                                        'components.pages.stargazing.event-upcoming.show-qr',
                                        'Покажите этот QR-код при входе на мероприятие'
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {isConfirmed && !!event?.members?.adults && (
                        <div className={styles.infoSection}>
                            <Icon
                                name={'Users'}
                                className={styles.icon}
                            />
                            {t(
                                'components.pages.stargazing.event-upcoming.members',
                                'Взрослых: {{adults}}, детей: {{children}}',
                                {
                                    adults: event.members.adults,
                                    children: event?.members?.children || 0
                                }
                            )}
                        </div>
                    )}

                    <div className={styles.infoSection}>
                        <Icon
                            name={'Point'}
                            className={styles.icon}
                        />
                        <div>
                            {isConfirmed && event?.location
                                ? event.location
                                : t(
                                      'components.pages.stargazing.event-upcoming.location-default',
                                      'Оренбургский район (~40 км от Оренбурга)'
                                  )}
                            {isConfirmed ? (
                                <ul className={styles.mapLinks}>
                                    <li>
                                        <a
                                            href={event?.yandexMap}
                                            title={t(
                                                'components.pages.stargazing.event-upcoming.yandex-maps-title',
                                                'Ссылка на Яндекс Картах'
                                            )}
                                            target={'_blank'}
                                            rel={'noreferrer'}
                                        >
                                            {t(
                                                'components.pages.stargazing.event-upcoming.yandex-maps',
                                                'Яндекс Карты'
                                            )}
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href={event?.googleMap}
                                            title={t(
                                                'components.pages.stargazing.event-upcoming.google-maps-title',
                                                'Ссылка на Google Картах'
                                            )}
                                            target={'_blank'}
                                            rel={'noreferrer'}
                                        >
                                            {t(
                                                'components.pages.stargazing.event-upcoming.google-maps',
                                                'Google Карты'
                                            )}
                                        </a>
                                    </li>
                                </ul>
                            ) : (
                                <div className={styles.notifyText}>
                                    {t(
                                        'components.pages.stargazing.event-upcoming.location-hidden',
                                        'Точное место проведения мероприятия будет доступно после регистрации'
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* If registration has already started AND there are no more places AND the user is not registered */}
                    {secondsUntilRegistrationStart < 0 && event?.availableTickets === 0 && !registered && (
                        <div className={styles.infoBlock}>
                            <h3>
                                {t(
                                    'components.pages.stargazing.event-upcoming.no-tickets',
                                    'К сожалению, все места закончились'
                                )}
                            </h3>
                            <p>
                                {t(
                                    'components.pages.stargazing.event-upcoming.no-tickets-hint',
                                    'Дополнительные места могут появиться, если кто-то отменит свою регистриацию. Или просто дождитесь следующего мероприятия.'
                                )}
                            </p>
                        </div>
                    )}

                    {/* If registration has not started yet */}
                    {secondsUntilRegistrationStart >= 0 && secondsUntilRegistrationEnd > 0 && (
                        <div className={styles.bookingLogin}>
                            <h3>
                                {t(
                                    'components.pages.stargazing.event-upcoming.registration-opens-in',
                                    'Регистрация на астровыезд откроется через'
                                )}{' '}
                                {getLocalizedTimeFromSec(secondsUntilRegistrationStart, true, t)}
                            </h3>
                        </div>
                    )}

                    {/* If registration has ended */}
                    {secondsUntilRegistrationEnd <= 0 && (
                        <div className={styles.bookingLogin}>
                            <h3>
                                {t(
                                    'components.pages.stargazing.event-upcoming.registration-closed',
                                    'Регистрация на астровыезд завершена'
                                )}
                            </h3>
                            <p>
                                {t(
                                    'components.pages.stargazing.event-upcoming.registration-closed-hint',
                                    'Пожалуйста дождитесь нашего следующего астровыезда, что бы его не пропустить - подпишитесь на Telegram канал'
                                )}
                            </p>
                        </div>
                    )}

                    {/* If registration is available */}
                    {registrationAvailable ? (
                        <>
                            {!user?.id && (
                                <div className={styles.bookingLogin}>
                                    <h3>
                                        {t(
                                            'components.pages.stargazing.event-upcoming.login-to-register',
                                            'Для регистрации на астровыезд войдите под своей учетной записью'
                                        )}
                                    </h3>
                                    <LoginForm />
                                </div>
                            )}

                            {user?.id && !registered && (
                                <EventBookingForm
                                    eventId={event?.id}
                                    ticketPrice={event?.ticketPrice}
                                    onSuccessSubmit={(id) => {
                                        setRegistered(true)
                                        setBookedId(id)
                                    }}
                                />
                            )}
                        </>
                    ) : !registered ? (
                        <>
                            {!user?.id && (
                                <div
                                    style={{
                                        margin: '0 auto',
                                        width: '80%'
                                    }}
                                >
                                    <LoginForm />
                                </div>
                            )}
                        </>
                    ) : (
                        ''
                    )}

                    {/* If user is registered (confirmed) */}
                    {isConfirmed &&
                        !(dayjs.utc(event?.registrationEnd?.date).local().diff(dayjs()) <= 0) &&
                        !(dayjs.utc(event?.date?.date).local().diff(dayjs()) <= 0) && (
                            <div className={styles.cancelRegistration}>
                                <p className={styles.notifyText}>
                                    {t(
                                        'components.pages.stargazing.event-upcoming.cancel-hint',
                                        'Если вы не сможете приехать, пожалуйста, отмените регистрацию - это поможет другим занять ваше место.'
                                    )}
                                </p>
                                <Button
                                    className={styles.cancelRegistrationButton}
                                    mode={'secondary'}
                                    variant={'negative'}
                                    loading={isLoading}
                                    disabled={isLoading}
                                    onClick={() => showConfirmation(true)}
                                >
                                    {t(
                                        'components.pages.stargazing.event-upcoming.cancel-booking',
                                        'Отменить бронирование'
                                    )}
                                </Button>
                            </div>
                        )}
                </div>

                <Dialog
                    title={t(
                        'components.pages.stargazing.event-upcoming.confirm-cancel-title',
                        'Подтвердите отмену бронирования'
                    )}
                    open={confirmation}
                    onCloseDialog={() => showConfirmation(false)}
                >
                    <div className={styles.confirmContent}>
                        <p>
                            {t(
                                'components.pages.stargazing.event-upcoming.confirm-cancel-text-1',
                                'Если вы отмените своё бронирование на этот астровыезд, то освободившимися местами смогут воспользоваться другие участники, которые хотят поехать.'
                            )}
                        </p>
                        <p>
                            {t(
                                'components.pages.stargazing.event-upcoming.confirm-cancel-text-2',
                                'Вы сможете повторно зарегистрироваться на этот астровыезд, если места ещё будут свободны.'
                            )}
                        </p>
                        {isPaidConfirmedBooking && (
                            <p>
                                {t(
                                    'components.pages.stargazing.event-upcoming.confirm-cancel-refund-text',
                                    'Оплата за билет будет автоматически возвращена на карту, с которой производилась оплата, в течение 1–10 рабочих дней.'
                                )}
                            </p>
                        )}
                    </div>
                    <div className={styles.confirmationFooter}>
                        <Button
                            mode={'secondary'}
                            onClick={() => showConfirmation(false)}
                        >
                            {t('components.pages.stargazing.event-upcoming.cancel', 'Отмена')}
                        </Button>

                        <Button
                            variant={'negative'}
                            mode={'primary'}
                            loading={isLoading}
                            disabled={isLoading}
                            onClick={handleCancelRegistration}
                        >
                            {t('components.pages.stargazing.event-upcoming.cancel-booking', 'Отменить бронирование')}
                        </Button>
                    </div>
                </Dialog>
            </div>
        </Container>
    )
}
