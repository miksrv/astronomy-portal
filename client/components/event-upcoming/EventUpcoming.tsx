import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Button, Container, ContainerProps, Dialog, Icon } from 'simple-react-ui-kit'

import Image from 'next/image'
import { useTranslation } from 'next-i18next'

import { API, ApiModel, useAppSelector } from '@/api'
import { hosts } from '@/api/constants'
import EventBookingForm from '@/components/event-booking-form'
import LoginForm from '@/components/login-form'
import { formatUTCDate, getLocalizedTimeFromSec, getSecondsUntilUTCDate } from '@/tools/dates'

import styles from './styles.module.sass'

// TODO: Remove from all components
// import { getTimeFromSec } from '@/tools/helpers'
interface EventBookingFormProps extends ContainerProps {
    event?: ApiModel.Event
}

const EventUpcoming: React.FC<EventBookingFormProps> = ({ event, ...props }) => {
    const { t } = useTranslation()

    const user = useAppSelector((state) => state.auth.user)

    const [registered, setRegistered] = useState<boolean>(false)
    const [confirmation, showConfirmation] = useState<boolean>(false)

    const [cancelRegistration, { isLoading }] = API.useEventsCancelRegistrationPostMutation()

    const handleCancelRegistration = async () => {
        await cancelRegistration({ eventId: event?.id || '' })
        showConfirmation(false)
        setRegistered(false)
    }

    const secondsUntilRegistrationStart = getSecondsUntilUTCDate(event?.registrationStart?.date) || 0
    const secondsUntilRegistrationEnd = getSecondsUntilUTCDate(event?.registrationEnd?.date) || 0

    const registrationAvailable = useMemo(() => {
        // Закончились слоты для регистрации
        if (event?.availableTickets === 0) {
            return false
        }

        // Дата регистрации еще не наступила
        if (secondsUntilRegistrationStart >= 0) {
            return false
        }

        // Дата регистрации уже закончилась
        if (secondsUntilRegistrationEnd <= 0) {
            return false
        }

        // Дата мероприятия уже наступило
        if ((getSecondsUntilUTCDate(event?.date?.date) || 0) <= 0) {
            return false
        }

        return true
    }, [event, secondsUntilRegistrationStart, secondsUntilRegistrationEnd])

    useEffect(() => {
        setRegistered(event?.registered || false)
    }, [event?.registered])

    return event?.id ? (
        <Container {...props}>
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
                        alt={`Астровыезд: ${event?.title}`}
                        width={1024}
                        height={768}
                    />
                </div>

                <div className={styles.stargazing}>
                    <h2 className={styles.title}>{event?.title}</h2>

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
                        {formatUTCDate(event?.date?.date, 'H:mm')}
                    </div>

                    <div className={styles.infoSection}>
                        <Icon
                            name={'Point'}
                            className={styles.icon}
                        />
                        {'Оренбургский район (40 км от города)'}
                    </div>

                    <div className={styles.infoSectionNotification}>
                        <div>{'Указано местное Оренбургское время (UTC+5)'}</div>
                        <div>{'Точное место проведения мероприятия будет доступно после регистрации'}</div>
                    </div>

                    {/* If registration has already started AND there are no more places AND the user is not registered */}
                    {secondsUntilRegistrationStart < 0 && event?.availableTickets === 0 && !registered && (
                        <div className={styles.infoBlock}>
                            <h3>К сожалению, все места закончились</h3>
                            <p>
                                Дополнительные места могут появиться, если кто-то отменит свою регистриацию. Или просто
                                дождитесь следующего мероприятия
                            </p>
                        </div>
                    )}

                    {/* If registration has not started yet */}
                    {secondsUntilRegistrationStart >= 0 && secondsUntilRegistrationEnd > 0 && (
                        <div className={styles.bookingLogin}>
                            <h3>
                                {'Регистрация на астровыезд откроется через'}{' '}
                                {getLocalizedTimeFromSec(secondsUntilRegistrationStart, true, t)}
                            </h3>
                        </div>
                    )}

                    {/* If registration has ended */}
                    {secondsUntilRegistrationEnd <= 0 && (
                        <div className={styles.bookingLogin}>
                            <h3>Регистрация на астровыезд завершена</h3>
                            <p>
                                Пожалуйста дождитесь нашего следующего астровыезда, что бы его не пропустить -
                                подпишитесь на Telegram канал
                            </p>
                        </div>
                    )}

                    {/* If registration is available */}
                    {registrationAvailable ? (
                        <div>
                            {!user?.id && (
                                <div className={styles.bookingLogin}>
                                    <h3>{'Для регистрации на астровыезд войдите под своей учетной записью'}</h3>
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
                        </div>
                    ) : !registered ? (
                        <div>
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
                        </div>
                    ) : (
                        ''
                    )}

                    {/* If user is registered */}
                    {user?.id && registered && secondsUntilRegistrationStart <= 0 && (
                        <div className={styles.registered}>
                            <h3>{'Вы зарегистрированы'}</h3>

                            <div>
                                Приезжайте <b>{formatUTCDate(event?.date?.date, 'D MMMM YYYY г.')}</b> к{' '}
                                <b>{formatUTCDate(event?.date?.date, 'H:mm')}</b> часам на место проведения мероприятия:
                                Оренбургский район, г. Горюн (40 км от центра Оренбурга), откройте карту ниже:
                            </div>

                            <div className={styles.mapLinks}>
                                <a
                                    href={event?.yandexMap ?? 'https://yandex.com/maps/-/CDvPzZkD'}
                                    title={'Ссылка на Яндекс Картах'}
                                    target={'_blank'}
                                    rel={'noreferrer'}
                                >
                                    Яндекс Карты
                                </a>
                                <a
                                    href={event?.googleMap ?? 'https://maps.app.goo.gl/MWEcbhNK6wj2eeEPA'}
                                    title={'Ссылка на Google Картах'}
                                    target={'_blank'}
                                    rel={'noreferrer'}
                                >
                                    Google Карты
                                </a>
                            </div>

                            {!(dayjs.utc(event?.registrationEnd?.date).local().diff(dayjs()) <= 0) &&
                                !(dayjs.utc(event?.date?.date).local().diff(dayjs()) <= 0) && (
                                    <div className={styles.cancelRegistration}>
                                        <p>
                                            Если вы не сможете приехать на мероприятие, пожалуйста, отмените свое
                                            бронирование, чтобы другие участники смогли воспользоваться освободившимися
                                            местами.
                                        </p>
                                        <Button
                                            className={styles.cancelRegistrationButton}
                                            mode={'secondary'}
                                            loading={isLoading}
                                            disabled={isLoading}
                                            onClick={() => showConfirmation(true)}
                                        >
                                            {'Отменить бронирование'}
                                        </Button>
                                    </div>
                                )}
                        </div>
                    )}

                    {/* If user is registered */}
                    {/*{user?.id && registered && (*/}
                    {/*    <div*/}
                    {/*        style={{*/}
                    {/*            marginTop: '40px'*/}
                    {/*        }}*/}
                    {/*        className={styles.bookingLogin}*/}
                    {/*    >*/}
                    {/*        <h3>*/}
                    {/*            Вы отменили свое бронирование*/}
                    {/*            <br />*/}
                    {/*            на это мероприятие*/}
                    {/*        </h3>*/}
                    {/*        <p>Если вы хотите приехать на астровыезд - пожалуйста, дождитесь следующего</p>*/}
                    {/*    </div>*/}
                    {/*)}*/}
                </div>

                <Dialog
                    title={'Подтвердите отмену бронирования'}
                    open={confirmation}
                    onCloseDialog={() => showConfirmation(false)}
                >
                    <div className={styles.confirmContent}>
                        <p>
                            Если вы отмените своё бронирование на этот астровыезд, то освободившимися местами смогут
                            воспользоваться другие участники, которые хотят поехать.
                        </p>
                        <p>Вы сможете повторно зарегистрироваться на этот астровыезд, если места ещё будут свободны.</p>
                    </div>
                    <div className={styles.confirmationFooter}>
                        <Button
                            mode={'secondary'}
                            onClick={() => showConfirmation(false)}
                        >
                            {'Отмена'}
                        </Button>

                        <Button
                            variant={'negative'}
                            mode={'primary'}
                            loading={isLoading}
                            disabled={isLoading}
                            onClick={handleCancelRegistration}
                        >
                            {'Подтверждаю'}
                        </Button>
                    </div>
                </Dialog>

                {/*<Confirm*/}
                {/*    open={confirmation}*/}
                {/*    size={'tiny'}*/}
                {/*    className={'confirm'}*/}
                {/*    header={'Подтвердите отмену бронирования'}*/}
                {/*    content={() => (*/}
                {/*        <div className={styles.confirmContent}>*/}
                {/*            <p>*/}
                {/*                Если вы отмените свое бронирование на этот*/}
                {/*                астровыезд, то освободившимися местами смогут*/}
                {/*                воспользоваться другие участники, которые хотят*/}
                {/*                поехать на астровыезд.*/}
                {/*            </p>*/}
                {/*            <p>*/}
                {/*                Если вы подтвердите отмену, то вы не сможете*/}
                {/*                повторно зарегистрироваться на этот астровыезд,*/}
                {/*                только на последующие.*/}
                {/*            </p>*/}
                {/*        </div>*/}
                {/*    )}*/}
                {/*    onCancel={() => showConfirmation(false)}*/}
                {/*    cancelButton={<Button>{'Я передумал(а)'}</Button>}*/}
                {/*    confirmButton={*/}
                {/*        <Button*/}
                {/*            color={'red'}*/}
                {/*            // primary={false}*/}
                {/*            onClick={handleCancelRegistration}*/}
                {/*        >*/}
                {/*            {'Подтверждаю'}*/}
                {/*        </Button>*/}
                {/*    }*/}
                {/*/>*/}
            </div>

            {/*<div className={styles.content}>*/}
            {/*    <Markdown>{event?.content}</Markdown>*/}
            {/*</div>*/}
        </Container>
    ) : null
}

export default EventUpcoming
