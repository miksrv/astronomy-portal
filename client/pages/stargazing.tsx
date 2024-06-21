import { API, ApiModel, useAppDispatch, useAppSelector } from '@/api'
import { formatUTCDate } from '@/functions/helpers'
import dayjs from 'dayjs'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useState } from 'react'
import Markdown from 'react-markdown'
import Gallery from 'react-photo-gallery'
import { Button, Dimmer, Grid, Loader } from 'semantic-ui-react'

import EventBookingForm from '@/components/event-booking-form/EventBookingForm'
import { show } from '@/components/login-form/loginFormSlice'
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
    const dispatch = useAppDispatch()

    const user = useAppSelector((state) => state.auth.user)
    const { data, isLoading, isFetching } = API.useEventsGetListQuery()

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
                    style={{ marginBottom: '15px', marginTop: '15px' }}
                >
                    <div>
                        <div className={'stargazing'}>
                            <h2 className={'title'}>{event.title}</h2>
                            <div className={'date'}>
                                {formatUTCDate(
                                    event.date?.date,
                                    'D MMMM, YYYY г.'
                                )}
                            </div>
                            <div className={'time'}>
                                {formatUTCDate(event.date?.date, 'H:mm')}
                            </div>

                            {event.availableTickets === 0 && (
                                <div>Места закончились</div>
                            )}

                            {dayjs
                                .utc(event.registrationStart?.date)
                                .local()
                                .diff(dayjs()) >= 0 && (
                                <div>Регистрация еще не начилась</div>
                            )}

                            {dayjs
                                .utc(event.registrationEnd?.date)
                                .local()
                                .diff(dayjs()) <= 0 && (
                                <div>Регистрация на мероприятие завершена</div>
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

                            {checkAvailabilityRegistration(event) && (
                                <div>
                                    {!user?.id && (
                                        <div className={'bookingLogin'}>
                                            <h3>
                                                {
                                                    'Для бронирования войдите нажмите кнопку "Войти"'
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

                            <div className={'registered'}>
                                {user?.id && event?.registered && (
                                    <h3>Вы зарегистрированы на мероприятие</h3>
                                )}
                            </div>
                        </div>

                        <Grid>
                            <Markdown>{event.content}</Markdown>
                        </Grid>
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
