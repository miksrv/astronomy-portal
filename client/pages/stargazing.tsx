import { API, ApiModel, useAppSelector } from '@/api'
import { formatUTCDate, getTimeFromSec } from '@/functions/helpers'
import dayjs from 'dayjs'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import Image from 'next/image'
import React, { useState } from 'react'
import Markdown from 'react-markdown'
import Gallery from 'react-photo-gallery'
import { Dimmer, Grid, Loader } from 'semantic-ui-react'

import EventBookingForm from '@/components/event-booking-form/EventBookingForm'
import LoginForm from '@/components/login-form/LoginForm'
import PhotoLightbox from '@/components/photo-lightbox'

import photoStargazing4 from '@/public/photos/stargazing-4.jpeg'
import photoStargazing7 from '@/public/photos/stargazing-7.jpeg'
import photoStargazing9 from '@/public/photos/stargazing-9.jpeg'
import photoStargazing10 from '@/public/photos/stargazing-10.jpeg'

interface StargazingPageProps {
    // events: ApiModel.Event[]
}

const galleryStargazing: any[] = [
    photoStargazing4,
    photoStargazing7,
    photoStargazing9,
    photoStargazing10
]

const StargazingPage: NextPage<StargazingPageProps> = () => {
    const user = useAppSelector((state) => state.auth.user)
    const { data, isFetching } = API.useEventsGetListQuery()

    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>(0)

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

    const handlePhotoClick = (index: number) => {
        setPhotoIndex(index)
        setShowLightbox(true)
    }

    const handleHideLightbox = () => {
        setShowLightbox(false)
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
                            height: 853,
                            url: '/photos/stargazing7.jpeg',
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />

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

            {eventsData?.map((event) => (
                <div
                    className={'box'}
                    key={event.id}
                    style={{ marginBottom: '15px', marginTop: '10px' }}
                >
                    <div
                        style={{
                            marginBottom: '30px',
                            padding: '0 5px'
                        }}
                    >
                        <Grid>
                            <Grid.Row>
                                <Grid.Column
                                    computer={9}
                                    tablet={9}
                                    mobile={16}
                                    style={{
                                        minHeight: '350px',
                                        width: '100%'
                                    }}
                                >
                                    <Image
                                        fill={true}
                                        src={`${process.env.NEXT_PUBLIC_API_HOST}${event.cover}`}
                                        alt={`Астровыезд: ${event.title}`}
                                    />
                                </Grid.Column>
                                <Grid.Column
                                    computer={7}
                                    tablet={7}
                                    mobile={16}
                                >
                                    <div className={'stargazing'}>
                                        <h2 className={'title'}>
                                            {event.title}
                                        </h2>
                                        <div className={'date'}>
                                            {formatUTCDate(
                                                event.date?.date,
                                                'D MMMM, YYYY г.'
                                            )}
                                        </div>
                                        <div className={'time'}>
                                            {formatUTCDate(
                                                event.date?.date,
                                                'H:mm'
                                            )}
                                        </div>

                                        {dayjs
                                            .utc(event.registrationEnd?.date)
                                            .local()
                                            .diff(dayjs()) > 0 &&
                                            event.availableTickets === 0 &&
                                            !event?.registered && (
                                                <div
                                                    style={{
                                                        marginTop: '40px'
                                                    }}
                                                    className={'bookingLogin'}
                                                >
                                                    <h3>
                                                        К сожалению, места
                                                        закончились
                                                    </h3>
                                                    <p>
                                                        Пожалуйста, дождитесь
                                                        нашего следующего
                                                        мероприятия!
                                                    </p>
                                                </div>
                                            )}

                                        {dayjs
                                            .utc(event.registrationStart?.date)
                                            .local()
                                            .diff(dayjs()) >= 0 && (
                                            <div className={'bookingLogin'}>
                                                <br />
                                                <h3
                                                    style={{
                                                        marginBottom: 0,
                                                        marginTop: '50px'
                                                    }}
                                                >
                                                    До начала регистрации
                                                    осталось
                                                </h3>
                                                <h3>
                                                    {getTimeFromSec(
                                                        dayjs
                                                            .utc(
                                                                event
                                                                    .registrationStart
                                                                    ?.date
                                                            )
                                                            .local()
                                                            .diff(
                                                                dayjs(),
                                                                'second'
                                                            ),
                                                        true
                                                    )}
                                                </h3>
                                                <p>
                                                    После начала регистрации
                                                    появится форма, заполнив
                                                    которую, вы сможете принять
                                                    участие в нашем мероприятии!
                                                </p>
                                            </div>
                                        )}

                                        {dayjs
                                            .utc(event.registrationEnd?.date)
                                            .local()
                                            .diff(dayjs()) <= 0 && (
                                            <div
                                                style={{
                                                    marginTop: '40px'
                                                }}
                                                className={'bookingLogin'}
                                            >
                                                <h3>
                                                    Регистрация на мероприятие
                                                    завершена
                                                </h3>
                                            </div>
                                        )}

                                        {/*<div>*/}
                                        {/*    До конца регистрации дней:{' '}*/}
                                        {/*    {dayjs*/}
                                        {/*        .utc(event.registrationEnd?.date)*/}
                                        {/*        .local()*/}
                                        {/*        .diff(dayjs(), 'day')}*/}
                                        {/*</div>*/}

                                        {/*{dayjs*/}
                                        {/*    .utc(event.date?.date)*/}
                                        {/*    .local()*/}
                                        {/*    .diff(dayjs()) <= 0 && (*/}
                                        {/*    <div>Дата мероприятия уже наступило</div>*/}
                                        {/*)}*/}

                                        {checkAvailabilityRegistration(
                                            event
                                        ) ? (
                                            <div>
                                                {!user?.id && (
                                                    <div
                                                        className={
                                                            'bookingLogin'
                                                        }
                                                    >
                                                        <h3>
                                                            {
                                                                'Для бронирования войдите под своей учетной записью'
                                                            }
                                                        </h3>
                                                        <LoginForm />
                                                    </div>
                                                )}

                                                {user?.id &&
                                                    !event?.registered && (
                                                        <EventBookingForm
                                                            eventId={event.id}
                                                        />
                                                    )}
                                            </div>
                                        ) : !event?.registered ? (
                                            <div>
                                                {!user?.id ? (
                                                    <div
                                                        style={{
                                                            margin: '10px auto',
                                                            width: '80%'
                                                        }}
                                                    >
                                                        <p>
                                                            Войдите под своей
                                                            учетной записью,
                                                            чтобы не пропустить
                                                            следующее
                                                            мероприятие
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

                                        <div className={'registered'}>
                                            {user?.id && event?.registered && (
                                                <>
                                                    <h3>
                                                        Вы зарегистрированы на
                                                        мероприятие
                                                    </h3>
                                                    <p>
                                                        Приезжайте на место
                                                        проведения <br />
                                                        мероприятия{' '}
                                                        <b>
                                                            {formatUTCDate(
                                                                event.date
                                                                    ?.date,
                                                                'D MMMM YYYY г.'
                                                            )}
                                                        </b>{' '}
                                                        к{' '}
                                                        <b>
                                                            {formatUTCDate(
                                                                event.date
                                                                    ?.date,
                                                                'H:mm'
                                                            )}
                                                        </b>{' '}
                                                        часам
                                                    </p>
                                                    <h2>
                                                        Место проведения
                                                        мероприятия
                                                    </h2>
                                                    <br />
                                                    <div>
                                                        <a
                                                            style={{
                                                                fontSize: '16px'
                                                            }}
                                                            href={
                                                                event?.yandexMap
                                                            }
                                                            title={
                                                                'Ссылка на Яндекс Картах'
                                                            }
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
                                                            href={
                                                                event?.googleMap
                                                            }
                                                            title={
                                                                'Ссылка на Google Картах'
                                                            }
                                                            target='_blank'
                                                            rel='noreferrer'
                                                        >
                                                            Google Карты
                                                        </a>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Grid.Column>
                            </Grid.Row>
                        </Grid>
                    </div>
                    <Markdown>{event.content}</Markdown>
                </div>
            ))}

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
                <p>
                    Астровыезд - это формат проведения научно-популярных
                    мероприятий, когда участники вечером выезжают за город для
                    того, чтобы принять участие в ночной экскурсии по звездному
                    небу. На астровыездах с помощью мультимедиа мы разбираем
                    интересные темы, связанные с космосом и астрономией,
                    наблюдаем в телескопы и общаемся с такими же интересными и
                    увлечёнными людьми.
                </p>
                <Gallery
                    photos={galleryStargazing}
                    columns={4}
                    direction={'row'}
                    targetRowHeight={200}
                    onClick={(event, photos) => {
                        handlePhotoClick(photos.index)
                    }}
                />
                <PhotoLightbox
                    photos={galleryStargazing.map((image) => image.src)}
                    photoIndex={photoIndex}
                    showLightbox={showLightbox}
                    onCloseLightBox={handleHideLightbox}
                    onChangeIndex={setPhotoIndex}
                />
            </div>
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
