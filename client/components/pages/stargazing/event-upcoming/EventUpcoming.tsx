import React, { useState } from 'react'
import dayjs from 'dayjs'
import { Button, cn, Container, Dialog, Icon, Spinner } from 'simple-react-ui-kit'

import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, useAppSelector } from '@/api'
import { hosts } from '@/api/constants'
import { LoginForm } from '@/components/common'
import { formatUTCDate, getLocalizedTimeFromSec } from '@/utils/dates'
import { getErrorMessage } from '@/utils/errors'

import { EventTicket } from '../event-ticket'

import { EventBookingForm } from './event-booking-form'
import noEventsImage from './no-events.png'
import { useEventBookingStatus } from './useEventBookingStatus'
import { useEventBookingSubmit } from './useEventBookingSubmit'

import styles from './styles.module.sass'

interface EventUpcomingProps {
    event?: ApiModel.Event
    /**
     * 'hero' (default) is the full-width stargazing-page widget with a cover
     * image. 'compact' drops the cover image and, on desktop, splits the
     * remaining content into an info column + a ticket column — used to
     * re-embed the same registration info/cancel flow inside the profile page.
     */
    layout?: 'hero' | 'compact'
}

interface GuestLoginPromptProps {
    className?: string
    heading?: React.ReactNode
}

// Guest (unauthenticated) call-to-action: per the "subscription = authentication"
// rule, logging in is itself what subscribes the visitor to the mailing — there
// is no separate subscribe form. Reused wherever a guest needs this nudge, with
// an optional heading for contexts that have a specific ask (e.g. "log in to register").
const GuestLoginPrompt: React.FC<GuestLoginPromptProps> = ({ className, heading }) => (
    <div className={className}>
        {heading && <h3>{heading}</h3>}
        <LoginForm />
    </div>
)

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

    const user = useAppSelector((state) => state.auth.user)
    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const canModerate = userRole === ApiModel.UserRole.ADMIN || userRole === ApiModel.UserRole.MODERATOR
    const canDelete = userRole === ApiModel.UserRole.ADMIN

    const [confirmation, showConfirmation] = useState<boolean>(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false)

    const [cancelRegistration, { isLoading }] = API.useEventsCancelRegistrationPostMutation()

    const [deleteEvent, { isLoading: isDeleting, error: deleteError }] = API.useEventDeleteMutation()

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

    const handleCancelRegistration = async () => {
        try {
            await cancelRegistration({ eventId: event?.id || '' }).unwrap()
            showConfirmation(false)
            setRegistered(false)
        } catch {
            showConfirmation(false)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!event?.id) {
            return
        }

        try {
            await deleteEvent(event.id).unwrap()
            setShowDeleteDialog(false)
            await router.replace(router.asPath)
        } catch {
            // Error surfaces from `deleteError` inside the confirmation dialog
        }
    }

    const handleRetryPayment = async () => {
        if (!event?.id) {
            return
        }

        await retrySubmit({
            adults: event.members?.adults || 1,
            children: event.members?.children || 0,
            childrenAges: event.members?.childrenAges,
            eventId: event.id,
            name: user?.name,
            phone: user?.phone
        })
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

    const ticketNode =
        isConfirmed && (event?.bookedId || bookedId) ? (
            <div className={styles.ticketBlock}>
                <EventTicket bookingId={event?.bookedId || bookedId} />
            </div>
        ) : null

    const mainContent = (
        <>
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
                    <h3>{t('components.pages.stargazing.event-upcoming.payment-failed-title', 'Оплата не прошла')}</h3>
                    <p>
                        {t(
                            'components.pages.stargazing.event-upcoming.payment-failed-text',
                            'Предыдущая попытка оплаты не была завершена. Место не забронировано — вы можете попробовать оплатить снова.'
                        )}
                    </p>

                    {isRetryError && (
                        <p className={styles.notifyText}>
                            {retryErrorMessage ||
                                t(
                                    'components.pages.stargazing.event-upcoming.retry-payment-error',
                                    'Не удалось создать новую попытку оплаты. Попробуйте позже.'
                                )}
                        </p>
                    )}

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
                                    {t('components.pages.stargazing.event-upcoming.yandex-maps', 'Яндекс Карты')}
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
                                    {t('components.pages.stargazing.event-upcoming.google-maps', 'Google Карты')}
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

            {/* This event never goes through online booking (sidewalk astronomy,
                legacy archive imports) — skip all registration-window messaging
                and the booking form entirely. */}
            {event?.requiresRegistration === false ? (
                <div className={styles.infoBlock}>
                    <h3>
                        {t(
                            'components.pages.stargazing.event-upcoming.no-registration-required',
                            'Регистрация не требуется'
                        )}
                    </h3>
                    <p>
                        {t(
                            'components.pages.stargazing.event-upcoming.no-registration-required-hint',
                            'Просто приходите в указанное время — предварительная запись не нужна.'
                        )}
                    </p>
                </div>
            ) : (
                <>
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
                                <GuestLoginPrompt
                                    className={styles.bookingLogin}
                                    heading={t(
                                        'components.pages.stargazing.event-upcoming.login-to-register',
                                        'Для регистрации на астровыезд войдите под своей учетной записью'
                                    )}
                                />
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
                        <>{!user?.id && <GuestLoginPrompt className={styles.guestSubscribe} />}</>
                    ) : (
                        ''
                    )}
                </>
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
                            {t('components.pages.stargazing.event-upcoming.cancel-booking', 'Отменить бронирование')}
                        </Button>
                    </div>
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
                                {userRole === ApiModel.UserRole.ADMIN && (
                                    <Button
                                        size={'small'}
                                        mode={'secondary'}
                                        icon={'Pencil'}
                                        title={t('common.edit', 'Редактировать')}
                                        onClick={() => router.push(`/stargazing/form?id=${event?.id}`)}
                                    />
                                )}

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
                    <h2 className={styles.title}>{event?.title}</h2>

                    {isConfirmed && (
                        <h3 className={styles.registeredTitle}>
                            {t('components.pages.stargazing.event-upcoming.you-are-registered', 'Вы зарегистрированы')}
                        </h3>
                    )}

                    {isCompact ? (
                        <div className={styles.compactColumns}>
                            <div className={styles.compactInfo}>{mainContent}</div>

                            {ticketNode && <div className={styles.compactTicket}>{ticketNode}</div>}
                        </div>
                    ) : (
                        <>
                            {ticketNode}
                            {mainContent}
                        </>
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

                <Dialog
                    title={t('components.pages.stargazing.event-upcoming.delete-confirm-title', 'Удалить астровыезд?')}
                    open={showDeleteDialog}
                    onCloseDialog={() => setShowDeleteDialog(false)}
                >
                    <div className={styles.confirmContent}>
                        <p>
                            {t(
                                'components.pages.stargazing.event-upcoming.delete-confirm-text',
                                'Это действие нельзя отменить. Астровыезд будет удалён безвозвратно.'
                            )}
                        </p>

                        {deleteError && (
                            <p className={styles.notifyText}>
                                {getErrorMessage(deleteError) ||
                                    t(
                                        'components.pages.stargazing.event-upcoming.delete-error',
                                        'Не удалось удалить астровыезд. Попробуйте позже.'
                                    )}
                            </p>
                        )}
                    </div>
                    <div className={styles.confirmationFooter}>
                        <Button
                            mode={'secondary'}
                            onClick={() => setShowDeleteDialog(false)}
                        >
                            {t('common.cancel', 'Отмена')}
                        </Button>

                        <Button
                            variant={'negative'}
                            mode={'primary'}
                            loading={isDeleting}
                            disabled={isDeleting}
                            onClick={handleDeleteConfirm}
                        >
                            {t('common.delete', 'Удалить')}
                        </Button>
                    </div>
                </Dialog>
            </div>
        </Container>
    )
}
