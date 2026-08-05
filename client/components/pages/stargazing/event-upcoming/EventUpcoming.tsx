import React, { useState } from 'react'
import dayjs from 'dayjs'
import { Button, cn, Container, Icon } from 'simple-react-ui-kit'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, useAppDispatch, useAppSelector } from '@/api'
import { openAuthDialog } from '@/api/applicationSlice'
import { hosts } from '@/api/constants'
import { formatUTCDate } from '@/utils/dates'
import { getErrorMessage } from '@/utils/errors'

import { EventBookingForm } from './event-booking-form'
import noEventsImage from './no-events.png'
import { StatusAwaitingPayment } from './StatusAwaitingPayment'
import { StatusLoginRequired } from './StatusLoginRequired'
import { StatusNoRegistrationRequired } from './StatusNoRegistrationRequired'
import { StatusPaymentExpired } from './StatusPaymentExpired'
import { StatusPaymentFailed } from './StatusPaymentFailed'
import { StatusPaymentRedirect } from './StatusPaymentRedirect'
import { StatusRegistered } from './StatusRegistered'
import { StatusRegistrationClosed } from './StatusRegistrationClosed'
import { StatusRegistrationOpensIn } from './StatusRegistrationOpensIn'
import { StatusSoldOut } from './StatusSoldOut'
import { useEventBookingStatus } from './useEventBookingStatus'
import { useEventBookingSubmit } from './useEventBookingSubmit'

import styles from './styles.module.sass'

// Admin-only and rarely used — kept out of the main bundle for everyone else.
const EventDeleteDialog = dynamic(() => import('../event-delete-dialog').then((mod) => mod.EventDeleteDialog), {
    ssr: false
})

// Most visitors never cancel a registration — kept out of the main bundle.
const CancelRegistrationDialog = dynamic(
    () => import('./CancelRegistrationDialog').then((mod) => mod.CancelRegistrationDialog),
    { ssr: false }
)

type EventInfoRow = {
    icon: React.ComponentProps<typeof Icon>['name']
    label: string
    value: React.ReactNode
}

interface EventUpcomingProps {
    event?: ApiModel.Event
    /**
     * 'hero' (default) is the full-width stargazing-page widget with a cover
     * image. 'compact' drops the cover image — used to re-embed the same
     * registration info/cancel flow inside the profile page.
     */
    layout?: 'hero' | 'compact'
}

export const EventUpcoming: React.FC<EventUpcomingProps> = ({ event: eventProp, layout = 'hero' }) => {
    const { t } = useTranslation()
    const router = useRouter()

    const isHero = layout === 'hero'

    // The 'hero' widget (public stargazing page) only ever received its event
    // as an SSR prop, with no client-side subscriber to the query — so the
    // `UPCOMING` tag invalidation that useEventBookingStatus() dispatches
    // after payment reconciliation/bfcache restore had nothing to trigger a
    // refetch, and the widget went stale until a full page reload. Subscribe
    // here so the tag invalidation actually refreshes the data. 'compact'
    // (profile page) already gets a live subscription from its caller via
    // useEventGetUpcomingRegisteredQuery(), so it's skipped here.
    const { data: liveEvent } = API.useEventGetUpcomingQuery(undefined, { skip: !isHero })

    const event = isHero ? (liveEvent ?? eventProp) : eventProp

    const dispatch = useAppDispatch()

    const user = useAppSelector((state) => state.auth.user)
    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const canModerate = userRole === ApiModel.UserRole.ADMIN || userRole === ApiModel.UserRole.MODERATOR
    const canDelete = userRole === ApiModel.UserRole.ADMIN

    const [confirmation, showConfirmation] = useState<boolean>(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false)
    // Bridges the ~1-2s gap between the bank payment URL being ready and the
    // browser actually navigating there (window.location.href doesn't unload
    // synchronously) — set as soon as either the booking form or a payment
    // retry gets a formUrl, so that gap shows a proper panel instead of nothing.
    const [redirectFormUrl, setRedirectFormUrl] = useState<string>()

    const [cancelRegistration, { isLoading, error: cancelError }] = API.useEventsCancelRegistrationPostMutation()

    const {
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
    } = useEventBookingStatus(event)

    const {
        submit: retrySubmit,
        isLoading: isRetrying,
        isError: isRetryError,
        errorMessage: retryErrorMessage
    } = useEventBookingSubmit()

    // "Зарегистрироваться заново" after a lapsed payment hold — deletes the
    // stale booking (same endpoint as the regular cancel flow, no confirmation
    // dialog needed since there's nothing active left to lose) so the user can
    // immediately book again instead of waiting on the background reconciliation.
    const handleReregister = async () => {
        try {
            await cancelRegistration({ eventId: event?.id || '' }).unwrap()
            setRegistered(false)
        } catch {
            // Error surfaces from `cancelError` inside the payment-expired panel
        }
    }

    const handleRetryPayment = async () => {
        if (!event?.id) {
            return
        }

        const result = await retrySubmit({
            adults: event.members?.adults || 1,
            children: event.members?.children || 0,
            childrenAges: event.members?.childrenAges,
            eventId: event.id,
            name: user?.name,
            phone: user?.phone
        })

        if (result?.redirectedToPayment) {
            setRedirectFormUrl(result.formUrl || '')
        }
    }

    if (!event) {
        return (
            <Container className={styles.noEvent}>
                <Image
                    className={styles.noEventImage}
                    src={noEventsImage}
                    alt={''}
                />
                <h2 className={cn(styles.noEventTitle, 'centeredHeading')}>
                    {t('components.pages.stargazing.event-upcoming.no-upcoming', 'Пока нет предстоящих астровыездов')}
                </h2>
                <p>
                    {t(
                        'components.pages.stargazing.event-upcoming.no-upcoming-hint',
                        'Как только мы запланируем следующий астровыезд - здесь появится форма регистрации.'
                    )}
                </p>
            </Container>
        )
    }

    const isCompact = layout === 'compact'

    // The cancel button inside the "registered" status card hides once
    // registration has closed or the event itself has already started —
    // nothing left to give up by then.
    const canCancelRegistration =
        isConfirmed &&
        !(dayjs.utc(event?.registrationEnd?.date).local().diff(dayjs()) <= 0) &&
        !(dayjs.utc(event?.date?.date).local().diff(dayjs()) <= 0)

    // Summary shown in the "Детали заявки" card of the payment-failed panel —
    // the amount matches EventBookingForm's calculation (children are free).
    const failedBookingDateTime = event?.endDate?.date
        ? `${formatUTCDate(event?.date?.date, 'D MMMM YYYY')}, ${formatUTCDate(event?.date?.date, 'HH:mm')} — ${formatUTCDate(event.endDate.date, 'HH:mm')}`
        : formatUTCDate(event?.date?.date, 'D MMMM YYYY, HH:mm')

    const failedBookingAmount = (event?.members?.adults || 0) * (event?.ticketPrice || 0)

    const infoRows: EventInfoRow[] = [
        {
            icon: 'Calendar',
            label: t('pages.stargazing.event-date-label', 'Дата (GMT+5)'),
            value: formatUTCDate(event?.date?.date, 'D MMMM, YYYY')
        },
        {
            icon: 'Time',
            label: t('pages.stargazing.event-time-label', 'Время (GMT+5)'),
            value: event?.endDate?.date
                ? `${formatUTCDate(event?.date?.date, 'HH:mm')} — ${formatUTCDate(event.endDate.date, 'HH:mm')}`
                : formatUTCDate(event?.date?.date, 'HH:mm')
        },
        {
            icon: 'PinDrop',
            label: t('pages.stargazing.event-location-label', 'Место'),
            value: (
                <>
                    {event?.location ||
                        t('components.pages.stargazing.event-upcoming.location-fallback', 'Загородная обсерватория')}
                    {isConfirmed && event?.address && <div className={styles.addressText}>{event.address}</div>}
                    {!isConfirmed && (
                        <div className={styles.notifyText}>
                            {t(
                                'components.pages.stargazing.event-upcoming.address-hidden',
                                'Адрес будет доступен после регистрации'
                            )}
                        </div>
                    )}
                </>
            )
        }
    ]

    const mainContent = (
        <>
            {infoRows.map((row) => (
                <div
                    key={row.label}
                    className={styles.infoSection}
                >
                    <span className={styles.rowLabel}>
                        <Icon
                            name={row.icon}
                            className={styles.icon}
                        />
                        {row.label}
                    </span>
                    <span className={styles.rowValue}>{row.value}</span>
                </div>
            ))}

            {/* Paid booking awaiting payment — seat is held with a countdown. While a
                pending payment is being actively re-verified with the gateway (on
                mount and on bfcache restore — there is no bank webhook), show a
                loader instead of the stale countdown/actions. */}
            {!redirectFormUrl && awaitingPayment && pendingPayment && (
                <StatusAwaitingPayment
                    isVerifyingPayment={isVerifyingPayment}
                    paymentTimeLeftLabel={paymentTimeLeftLabel}
                    formUrl={pendingPayment.formUrl}
                    isLoading={isLoading}
                    onCancelBooking={() => showConfirmation(true)}
                />
            )}

            {/* Payment declined or the hold already lapsed — the booking is kept (not
                deleted) so retrying reuses it instead of re-filling the form. */}
            {!redirectFormUrl && failedPayment && (
                <StatusPaymentFailed
                    dateTime={failedBookingDateTime}
                    location={
                        event?.location ||
                        t('components.pages.stargazing.event-upcoming.location-fallback', 'Загородная обсерватория')
                    }
                    adults={event?.members?.adults || 0}
                    children={event?.members?.children || 0}
                    childrenAges={event?.members?.childrenAges}
                    amount={failedBookingAmount}
                    isRetryError={isRetryError}
                    retryErrorMessage={retryErrorMessage}
                    isRetrying={isRetrying}
                    isLoading={isLoading}
                    onRetryPayment={handleRetryPayment}
                    onCancelRequest={() => showConfirmation(true)}
                />
            )}

            {/* Payment hold lapsed but the server hasn't reconciled it yet (a
                refetch is already in flight — see useEventBookingStatus) — this
                should be brief and self-correct into the confirmed/failed state.
                The button lets the user clear the stale hold immediately instead
                of waiting on that background reconciliation. */}
            {!redirectFormUrl && registered && event?.bookingStatus === 'pending' && !awaitingPayment && (
                <StatusPaymentExpired
                    hasError={!!cancelError}
                    errorMessage={getErrorMessage(cancelError)}
                    isLoading={isLoading}
                    onReregister={handleReregister}
                />
            )}

            {/* Booking form submitted a paid registration and got a bank formUrl —
                bridges the gap before the browser actually navigates there. Shown
                in the same slot as the other "blocked" states, below the static
                event info (date/time/location) like everywhere else. */}
            {redirectFormUrl && <StatusPaymentRedirect formUrl={redirectFormUrl} />}

            {/* This event never goes through online booking (sidewalk astronomy,
                legacy archive imports) — skip all registration-window messaging
                and the booking form entirely. */}
            {!redirectFormUrl &&
                (event?.requiresRegistration === false ? (
                    <StatusNoRegistrationRequired />
                ) : (
                    <>
                        {/* If registration has already started AND there are no more places AND the user is not registered */}
                        {secondsUntilRegistrationStart < 0 && event?.availableTickets === 0 && !registered && (
                            <StatusSoldOut />
                        )}

                        {/* If registration has not started yet AND the user is not registered */}
                        {secondsUntilRegistrationStart >= 0 && secondsUntilRegistrationEnd > 0 && !registered && (
                            <StatusRegistrationOpensIn secondsUntilStart={secondsUntilRegistrationStart} />
                        )}

                        {/* If registration has ended AND the user is not registered — otherwise a
                            confirmed/pending booking whose event still lies ahead (registration
                            windows commonly close before the event itself) would show this
                            "closed" panel alongside their ticket/map. */}
                        {secondsUntilRegistrationEnd <= 0 && !registered && <StatusRegistrationClosed />}

                        {/* If registration is available */}
                        {registrationAvailable ? (
                            <>
                                {!user?.id && <StatusLoginRequired onSignIn={() => dispatch(openAuthDialog())} />}

                                {user?.id && !registered && (
                                    <EventBookingForm
                                        eventId={event?.id}
                                        ticketPrice={event?.ticketPrice}
                                        onSuccessSubmit={(id) => {
                                            setRegistered(true)
                                            setBookedId(id)
                                        }}
                                        onPaymentRedirect={(formUrl) => setRedirectFormUrl(formUrl)}
                                    />
                                )}
                            </>
                        ) : !registered ? (
                            <>
                                {!user?.id && (
                                    <Button
                                        className={styles.subscribeSignInButton}
                                        mode={'primary'}
                                        icon={'User'}
                                        onClick={() => dispatch(openAuthDialog())}
                                    >
                                        {t('components.pages.stargazing.event-upcoming.sign-in', 'Войти')}
                                    </Button>
                                )}
                            </>
                        ) : (
                            ''
                        )}
                    </>
                ))}

            {/* If user is registered (confirmed) — the ticket itself is the
                confirmation, so this card is just map with directions, ticket
                (click to download), and the cancel button. */}
            {isConfirmed && (
                <StatusRegistered
                    eventId={event?.id}
                    title={event?.title}
                    date={event?.date}
                    endDate={event?.endDate}
                    location={event?.location}
                    address={event?.address}
                    latitude={event?.latitude}
                    longitude={event?.longitude}
                    bookingId={event?.bookedId || bookedId}
                    showCancelButton={canCancelRegistration}
                    isLoading={isLoading}
                    isCompact={isCompact}
                    onCancelBooking={() => showConfirmation(true)}
                />
            )}
        </>
    )

    return (
        <Container>
            <div className={cn(styles.upcomingEvent, isCompact && styles.compact)}>
                {!isCompact && (
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

                        {canModerate && (
                            <div className={styles.adminActions}>
                                <Button
                                    size={'small'}
                                    mode={'secondary'}
                                    icon={'Pencil'}
                                    title={t('common.edit', 'Редактировать')}
                                    onClick={() => router.push(`/stargazing/form?id=${event?.id}`)}
                                />

                                <Button
                                    size={'small'}
                                    mode={'secondary'}
                                    icon={'BarChart'}
                                    title={t('components.pages.stargazing.event-upcoming.statistic', 'Статистика')}
                                    onClick={() => router.push(`/stargazing/${event?.id}/statistic`)}
                                />

                                {canDelete && (
                                    <Button
                                        size={'small'}
                                        mode={'primary'}
                                        variant={'negative'}
                                        icon={'Close'}
                                        title={t('common.delete', 'Удалить')}
                                        onClick={() => setShowDeleteDialog(true)}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.stargazing}>
                    <h2 className={styles.title}>
                        {isConfirmed ? (
                            <>
                                <Icon
                                    name={'CheckCircle'}
                                    className={styles.titleIcon}
                                />
                                {t(
                                    'components.pages.stargazing.event-upcoming.registered-title',
                                    'Вы зарегистрированы на астровыезд'
                                )}
                            </>
                        ) : (
                            t('components.pages.stargazing.event-upcoming.title', 'Регистрация на астровыезд')
                        )}
                    </h2>

                    {event?.title && <h3 className={styles.eventTitle}>{event.title}</h3>}

                    {mainContent}
                </div>

                <CancelRegistrationDialog
                    eventId={event?.id}
                    isPaidConfirmedBooking={isPaidConfirmedBooking}
                    open={confirmation}
                    onClose={() => showConfirmation(false)}
                    onCancelled={() => setRegistered(false)}
                />

                {canDelete && (
                    <EventDeleteDialog
                        eventId={event?.id}
                        open={showDeleteDialog}
                        onClose={() => setShowDeleteDialog(false)}
                    />
                )}
            </div>
        </Container>
    )
}
