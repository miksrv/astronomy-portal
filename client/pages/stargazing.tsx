import { API, ApiModel } from '@/api'
import { wrapper } from '@/api/store'
import { formatDate, isOutdated } from '@/functions/helpers'
import dayjs from 'dayjs'
import { GetServerSidePropsResult, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React from 'react'

interface StargazingPageProps {
    events: ApiModel.Event[]
}

const StargazingPage: NextPage<StargazingPageProps> = ({ events }) => {
    const currentDate = dayjs().toISOString()

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
            {events?.map((event) => (
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
                        <div>{formatDate(event.date, 'D MMMM YYYY')}</div>
                        <div>{formatDate(event.date, 'H:mm')}</div>
                        <div>{event.content}</div>
                        {!isOutdated(currentDate, event.registrationStart!) && (
                            <div>Дата регистрации наступила</div>
                        )}

                        {isOutdated(currentDate, event.registrationEnd!) && (
                            <div>Дата окончания еще не прошла</div>
                        )}

                        {isOutdated(currentDate, event.date!) && (
                            <div>Мероприятие еще не наступило</div>
                        )}
                    </div>
                </div>
            ))}
        </main>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (): Promise<GetServerSidePropsResult<StargazingPageProps>> => {
            const { data } = await store.dispatch(
                API.endpoints?.eventsGetList.initiate()
            )

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    events: data?.items || []
                }
            }
        }
)

export default StargazingPage
