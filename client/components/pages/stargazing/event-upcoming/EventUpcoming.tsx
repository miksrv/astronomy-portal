import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Button, Container, Dialog, Icon } from 'simple-react-ui-kit'

import Image from 'next/image'
import { useTranslation } from 'next-i18next'

import { API, ApiModel, useAppSelector } from '@/api'
import { hosts } from '@/api/constants'
import { LoginForm } from '@/components/common'
import { formatUTCDate, getLocalizedTimeFromSec, getSecondsUntilUTCDate } from '@/utils/dates'

import { EventBookingForm } from './event-booking-form'

import styles from './styles.module.sass'

interface EventUpcomingProps {
    event?: ApiModel.Event
}

export const EventUpcoming: React.FC<EventUpcomingProps> = ({ event }) => {
    const { t } = useTranslation()

    const user = useAppSelector((state) => state.auth.user)

    const [registered, setRegistered] = useState<boolean>(false)
    const [confirmation, showConfirmation] = useState<boolean>(false)
    const [tick, setTick] = useState<number>(0)

    const [cancelRegistration, { isLoading }] = API.useEventsCancelRegistrationPostMutation()

    const handleCancelRegistration = async () => {
        try {
            await cancelRegistration({ eventId: event?.id || '' }).unwrap()
            showConfirmation(false)
            setRegistered(false)
        } catch {
            showConfirmation(false)
        }
    }

    // Recomputed on every tick so countdown values update each second
    const secondsUntilRegistrationStart = getSecondsUntilUTCDate(event?.registrationStart?.date) || 0
    const secondsUntilRegistrationEnd = getSecondsUntilUTCDate(event?.registrationEnd?.date) || 0

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
        const interval = setInterval(() => {
            setTick((prev) => prev + 1)
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    if (!event) {
        return (
            <Container className={styles.noEvent}>
                <Icon
                    name={'Moon'}
                    className={styles.noEventIcon}
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

                    {registered && (
                        <h3 className={styles.registeredTitle}>
                            {t('components.pages.stargazing.event-upcoming.you-are-registered', 'Вы зарегистрированы')}
                        </h3>
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

                    {registered && (
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

                    {registered && !!event?.members?.adults && (
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
                            {registered && event?.location
                                ? event.location
                                : t(
                                      'components.pages.stargazing.event-upcoming.location-default',
                                      'Оренбургский район (~40 км от Оренбурга)'
                                  )}
                            {registered ? (
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
                                    onSuccessSubmit={() => {
                                        setRegistered(true)
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

                    {/* If user is registered */}
                    {registered &&
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
