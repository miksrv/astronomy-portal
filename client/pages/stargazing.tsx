import { API, useAppDispatch, useAppSelector } from '@/api'
import { ApiModel } from '@/api'
// import { wrapper } from '@/api/store'
import { formatUTCDate } from '@/functions/helpers'
import dayjs from 'dayjs'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React from 'react'
import { Button } from 'semantic-ui-react'

import EventBookingForm from '@/components/event-booking-form/EventBookingForm'
import { show } from '@/components/login-form/loginFormSlice'

interface StargazingPageProps {
    // events: ApiModel.Event[]
}

const StargazingPage: NextPage<StargazingPageProps> = () => {
    const dispatch = useAppDispatch()

    const user = useAppSelector((state) => state.auth.user)
    const { data } = API.useEventsGetListQuery()

    const eventsData = data?.items

    const checkAvailabilityRegistration = (event: ApiModel.Event) => {
        // Закончились слоты для регистрации
        if (event.availableTickets === 0) {
            return false
        }

        // Дата регистрации еще не наступила
        if (
            dayjs.utc(event.registrationStart?.date).local().diff(dayjs()) >= 0
        ) {
            return false
        }

        // Дата регистрации уже закончилась
        if (dayjs.utc(event.registrationEnd?.date).local().diff(dayjs()) <= 0) {
            return false
        }

        // Дата мероприятия уже наступило
        if (dayjs.utc(event.date?.date).local().diff(dayjs()) <= 0) {
            return false
        }

        return true
    }

    return (
        <main>
            <NextSeo
                title={'Астровыезд'}
                description={
                    'Астровыезд в Оренбурге - это уникальная возможность насладиться звёздным небом в полной темноте. Присоединяйтесь к нашим поездкам с телескопами за город, чтобы увидеть космические объекты в полях Оренбуржья. Увлекательные наблюдения и захватывающие открытия ждут вас на каждом астровыезде.'
                }
                openGraph={{
                    images: [
                        {
                            height: 743,
                            url: '/screenshots/photos.jpg',
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />
            <div className={'box'}>
                <h1>Астровыезды</h1>
                <p>
                    Астровыезд в Оренбурге - это уникальная возможность
                    насладиться звёздным небом в полной темноте. Присоединяйтесь
                    к нашим поездкам с телескопами за город, чтобы увидеть
                    космические объекты в полях Оренбуржья. Увлекательные
                    наблюдения и захватывающие открытия ждут вас на каждом
                    астровыезде.
                </p>
            </div>
            {eventsData?.map((event) => (
                <div
                    className={'box'}
                    key={event.id}
                    style={{ marginBottom: '15px', marginTop: '15px' }}
                >
                    <div style={{ textAlign: 'center' }}>
                        <h2
                            style={{
                                fontSize: '2em !important'
                            }}
                        >
                            {event.title}
                        </h2>
                        <div>
                            {formatUTCDate(event.date?.date, 'D MMMM YYYY')}
                        </div>
                        <div>{formatUTCDate(event.date?.date, 'H:mm')}</div>
                        <div>{event.content}</div>

                        <div>
                            {event.availableTickets === 0
                                ? 'Места закончились'
                                : `Свободные места: ${event.availableTickets}`}
                        </div>

                        {dayjs
                            .utc(event.registrationStart?.date)
                            .local()
                            .diff(dayjs()) >= 0 && (
                            <div>Дата регистрации еще не наступила</div>
                        )}

                        {dayjs
                            .utc(event.registrationEnd?.date)
                            .local()
                            .diff(dayjs()) <= 0 && (
                            <div>Дата окончания регистрации уже прошла</div>
                        )}

                        <div>
                            До конца регистрации дней:{' '}
                            {dayjs
                                .utc(event.registrationEnd?.date)
                                .local()
                                .diff(dayjs(), 'day')}
                        </div>

                        {dayjs.utc(event.date?.date).local().diff(dayjs()) <=
                            0 && <div>Дата мероприятия уже наступило</div>}

                        {checkAvailabilityRegistration(event) && (
                            <div>
                                {!user?.id && (
                                    <div
                                        style={{
                                            margin: '20px auto',
                                            maxWidth: '500px',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <h3>
                                            {
                                                'Для бронирования войдите под своим профилем'
                                            }
                                        </h3>
                                        <Button
                                            fluid={true}
                                            size={'tiny'}
                                            color={'green'}
                                            onClick={() => dispatch(show())}
                                        >
                                            {'Войти'}
                                        </Button>
                                    </div>
                                )}

                                {user?.id && !event?.registered && (
                                    <EventBookingForm eventId={event.id} />
                                )}
                            </div>
                        )}

                        <div>
                            {user?.id && event?.registered && (
                                <h3>Вы зарегистрированы на мероприятие</h3>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </main>
    )
}

// export const getServerSideProps = wrapper.getServerSideProps(
//     (store) =>
//         async (): Promise<GetServerSidePropsResult<StargazingPageProps>> => {
//             const { data } = await store.dispatch(
//                 API.endpoints?.eventsGetList.initiate()
//             )
//
//             await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))
//
//             return {
//                 props: {
//                     events: data?.items || []
//                 }
//             }
//         }
// )

export default StargazingPage
