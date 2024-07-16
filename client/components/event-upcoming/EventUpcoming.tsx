import { API, ApiModel, useAppSelector } from '@/api'
import { formatUTCDate, getTimeFromSec } from '@/functions/helpers'
import Container from '@/ui/container'
import dayjs from 'dayjs'
import Image from 'next/image'
import React from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'

import EventBookingForm from '@/components/event-booking-form'
import LoginForm from '@/components/login-form'

import styles from './styles.module.sass'

interface EventBookingFormProps {}

const EventUpcoming: React.FC<EventBookingFormProps> = () => {
    const user = useAppSelector((state) => state.auth.user)

    const { data, isFetching } = API.useEventGetUpcomingQuery()

    const checkAvailabilityRegistration = (event?: ApiModel.Event) => {
        // Закончились слоты для регистрации
        if (event?.availableTickets === 0) {
            return false
        }

        // Дата регистрации еще не наступила
        if (
            dayjs.utc(event?.registrationStart?.date).local().diff(dayjs()) >= 0
        ) {
            return false
        }

        // Дата регистрации уже закончилась
        if (
            dayjs.utc(event?.registrationEnd?.date).local().diff(dayjs()) <= 0
        ) {
            return false
        }

        // Дата мероприятия уже наступило
        if (dayjs.utc(event?.date?.date).local().diff(dayjs()) <= 0) {
            return false
        }

        return true
    }

    return (
        <Container>
            {isFetching && (
                <div
                    className={'box'}
                    style={{
                        height: 200,
                        marginBottom: '15px',
                        marginTop: '15px',
                        width: '100%'
                    }}
                >
                    <Dimmer active={true}>
                        <Loader content={'Подождите, идет загрузка...'} />
                    </Dimmer>
                </div>
            )}

            <div className={styles.upcomingEvent}>
                <div className={styles.imageContainer}>
                    <Image
                        className={'stargazingImage'}
                        src={`${process.env.NEXT_PUBLIC_API_HOST}${data?.cover}`}
                        alt={`Астровыезд: ${data?.title}`}
                        width={1024}
                        height={768}
                    />
                </div>
                <div className={styles.stargazing}>
                    <h2 className={styles.title}>{data?.title}</h2>
                    <div className={styles.date}>
                        {formatUTCDate(data?.date?.date, 'D MMMM, YYYY г.')}
                    </div>
                    <div className={styles.time}>
                        {formatUTCDate(data?.date?.date, 'H:mm')}
                    </div>

                    {dayjs
                        .utc(data?.registrationEnd?.date)
                        .local()
                        .diff(dayjs()) > 0 &&
                        data?.availableTickets === 0 &&
                        !data?.registered && (
                            <div
                                style={{
                                    marginTop: '40px'
                                }}
                                className={styles.bookingLogin}
                            >
                                <h3>К сожалению, места закончились</h3>
                                <p>
                                    Пожалуйста, дождитесь нашего следующего
                                    мероприятия!
                                </p>
                            </div>
                        )}

                    {dayjs
                        .utc(data?.registrationStart?.date)
                        .local()
                        .diff(dayjs()) >= 0 && (
                        <div className={styles.bookingLogin}>
                            <br />
                            <h3
                                style={{
                                    marginBottom: 0,
                                    marginTop: '50px'
                                }}
                            >
                                До начала регистрации осталось
                            </h3>
                            <h3>
                                {getTimeFromSec(
                                    dayjs
                                        .utc(data?.registrationStart?.date)
                                        .local()
                                        .diff(dayjs(), 'second'),
                                    true
                                )}
                            </h3>
                            <p>
                                После начала регистрации появится форма,
                                заполнив которую, вы сможете принять участие в
                                нашем мероприятии!
                            </p>
                        </div>
                    )}

                    {dayjs
                        .utc(data?.registrationEnd?.date)
                        .local()
                        .diff(dayjs()) <= 0 && (
                        <div
                            style={{
                                marginTop: '40px'
                            }}
                            className={styles.bookingLogin}
                        >
                            <h3>Регистрация на мероприятие завершена</h3>
                        </div>
                    )}

                    {/*<div>*/}
                    {/*    До конца регистрации дней:{' '}*/}
                    {/*    {dayjs*/}
                    {/*        .utc(data?.registrationEnd?.date)*/}
                    {/*        .local()*/}
                    {/*        .diff(dayjs(), 'day')}*/}
                    {/*</div>*/}

                    {/*{dayjs*/}
                    {/*    .utc(data?.date?.date)*/}
                    {/*    .local()*/}
                    {/*    .diff(dayjs()) <= 0 && (*/}
                    {/*    <div>Дата мероприятия уже наступило</div>*/}
                    {/*)}*/}

                    {checkAvailabilityRegistration(data) ? (
                        <div>
                            {!user?.id && (
                                <div className={styles.bookingLogin}>
                                    <h3>
                                        {
                                            'Для бронирования войдите под своей учетной записью'
                                        }
                                    </h3>
                                    <LoginForm />
                                </div>
                            )}

                            {user?.id && !data?.registered && (
                                <EventBookingForm eventId={data?.id} />
                            )}
                        </div>
                    ) : !data?.registered ? (
                        <div>
                            {!user?.id ? (
                                <div
                                    style={{
                                        margin: '10px auto',
                                        width: '80%'
                                    }}
                                >
                                    <p>
                                        Войдите под своей учетной записью, чтобы
                                        не пропустить следующее мероприятие
                                    </p>
                                    <LoginForm />
                                </div>
                            ) : (
                                ''
                            )}
                        </div>
                    ) : (
                        ''
                    )}

                    {user?.id && data?.registered && (
                        <div className={styles.registered}>
                            <h3>Вы зарегистрированы на мероприятие</h3>
                            <p>
                                Приезжайте на место проведения <br />
                                мероприятия{' '}
                                <b>
                                    {formatUTCDate(
                                        data?.date?.date,
                                        'D MMMM YYYY г.'
                                    )}
                                </b>{' '}
                                к{' '}
                                <b>{formatUTCDate(data?.date?.date, 'H:mm')}</b>{' '}
                                часам
                            </p>
                            <h2>Место проведения мероприятия</h2>
                            <br />
                            <div>
                                <a
                                    style={{
                                        fontSize: '16px'
                                    }}
                                    href={data?.yandexMap}
                                    title={'Ссылка на Яндекс Картах'}
                                    target='_blank'
                                    rel='noreferrer'
                                >
                                    Яндекс Карты
                                </a>
                            </div>
                            <div>
                                <a
                                    style={{
                                        fontSize: '16px'
                                    }}
                                    href={data?.googleMap}
                                    title={'Ссылка на Google Картах'}
                                    target='_blank'
                                    rel='noreferrer'
                                >
                                    Google Карты
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/*<div className={'stargazingText'}>*/}
            {/*    <Markdown>{data?.content}</Markdown>*/}
            {/*</div>*/}
        </Container>
    )
}

export default EventUpcoming
