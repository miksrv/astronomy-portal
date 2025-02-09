import { API, ApiModel, useAppSelector } from '@/api'
import { hosts } from '@/api/constants'
import { formatUTCDate, getTimeFromSec } from '@/functions/helpers'
import dayjs from 'dayjs'
import Image from 'next/image'
import React from 'react'
import Markdown from 'react-markdown'
import { Button, Container, Spinner } from 'simple-react-ui-kit'

import EventBookingForm from '@/components/event-booking-form'
import LoginForm from '@/components/login-form'

import styles from './styles.module.sass'

interface EventBookingFormProps {}

const EventUpcoming: React.FC<EventBookingFormProps> = () => {
    const user = useAppSelector((state) => state.auth.user)

    // const [confirmation, showConfirmation] = useState<boolean>(false)

    const {
        data,
        isFetching,
        isLoading: upcomingLoading
    } = API.useEventGetUpcomingQuery()
    // const [{ isLoading }] = API.useEventsCancelRegistrationPostMutation() // cancelRegistration

    // const handleCancelRegistration = () => {
    //     cancelRegistration({ eventId: data?.id || '' })
    //     showConfirmation(false)
    // }

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

    return data?.id ? (
        <Container>
            {upcomingLoading && (
                <div
                    className={'box'}
                    style={{
                        height: 200,
                        marginBottom: '15px',
                        marginTop: '15px',
                        width: '100%'
                    }}
                >
                    <Spinner />
                </div>
            )}

            <div className={styles.upcomingEvent}>
                <div className={styles.imageContainer}>
                    <Image
                        className={'stargazingImage'}
                        src={`${hosts.stargazing}${data?.id}/${data?.coverFileName}.${data?.coverFileExt}`}
                        alt={`Астровыезд: ${data?.title}`}
                        width={1024}
                        height={768}
                    />
                </div>
                <div className={styles.stargazing}>
                    <h2 className={styles.title}>{data?.title}</h2>
                    <div className={styles.date}>
                        {formatUTCDate(
                            data?.date?.date,
                            'D MMMM, YYYY г., H:mm'
                        )}
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
                            {!user?.id && (
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
                            )}
                        </div>
                    ) : (
                        ''
                    )}

                    {user?.id && data?.registered && !data?.canceled && (
                        <div className={styles.registered}>
                            <h3>Вы зарегистрированы на мероприятие</h3>
                            <p>
                                Приезжайте{' '}
                                <b>
                                    {formatUTCDate(
                                        data?.date?.date,
                                        'D MMMM YYYY г.'
                                    )}
                                </b>{' '}
                                к{' '}
                                <b>{formatUTCDate(data?.date?.date, 'H:mm')}</b>{' '}
                                часам
                                <br />
                                на место проведения мероприятия: Оренбургский
                                район, г. Горюн (40 км от центра Оренбурга)
                            </p>
                            <p>
                                <strong style={{ color: 'red' }}>
                                    Используйте ссылки ниже, чтобы найти точное
                                    местоположение проведения мероприятия:
                                </strong>
                            </p>
                            <div className={styles.mapLinks}>
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

                            {!(
                                dayjs
                                    .utc(data?.registrationEnd?.date)
                                    .local()
                                    .diff(dayjs()) <= 0
                            ) &&
                                !(
                                    dayjs
                                        .utc(data?.date?.date)
                                        .local()
                                        .diff(dayjs()) <= 0
                                ) && (
                                    <div className={styles.cancelRegistration}>
                                        <p style={{ fontWeight: '100' }}>
                                            Если вы не сможете поехать на
                                            мероприятие - отмените бронирование,
                                            ваши места будут доступны другим
                                        </p>
                                        <Button
                                            // fluid={true}
                                            color={'red'}
                                            // loading={isLoading}
                                            // disabled={isLoading}
                                            // onClick={() =>
                                            //     showConfirmation(true)
                                            // }
                                        >
                                            {'Отменить бронирование'}
                                        </Button>
                                    </div>
                                )}
                        </div>
                    )}

                    {user?.id && data?.registered && data?.canceled && (
                        <div
                            style={{
                                marginTop: '40px'
                            }}
                            className={styles.bookingLogin}
                        >
                            <h3>
                                Вы отменили свое бронирование
                                <br />
                                на это мероприятие
                            </h3>
                            <p>
                                Если вы хотите приехать на астровыезд -
                                пожалуйста, дождитесь следующего
                            </p>
                        </div>
                    )}
                </div>

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

            <div className={styles.content}>
                <Markdown>{data?.content}</Markdown>
            </div>
        </Container>
    ) : (
        <Container>
            <div style={{ margin: '20px', textAlign: 'center' }}>
                {isFetching
                    ? 'Пожалуйста, подождите...'
                    : 'Нет предстоящих астровыездов'}
            </div>
        </Container>
    )
}

export default EventUpcoming
