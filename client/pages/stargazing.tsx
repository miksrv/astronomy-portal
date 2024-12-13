import { API, ApiModel } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import React, { useState } from 'react'
import Gallery from 'react-photo-gallery'
import { Container } from 'simple-react-ui-kit'

import AppLayout from '@/components/app-layout'
import EventUpcoming from '@/components/event-upcoming'
import EventsList from '@/components/events-list'
import PhotoLightboxOld from '@/components/photo-lightbox-old'

import photoStargazing4 from '@/public/photos/stargazing-4.jpeg'
import photoStargazing7 from '@/public/photos/stargazing-7.jpeg'
import photoStargazing9 from '@/public/photos/stargazing-9.jpeg'
import photoStargazing10 from '@/public/photos/stargazing-10.jpeg'

interface StargazingPageProps {
    events: ApiModel.Event[]
}

const galleryStargazing: any[] = [
    photoStargazing4,
    photoStargazing7,
    photoStargazing9,
    photoStargazing10
]

const StargazingPage: NextPage<StargazingPageProps> = ({ events }) => {
    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>(0)

    const handlePhotoClick = (index: number) => {
        setPhotoIndex(index)
        setShowLightbox(true)
    }

    const handleHideLightbox = () => {
        setShowLightbox(false)
    }

    return (
        <AppLayout>
            <NextSeo
                title={'Астровыезд'}
                description={''}
                openGraph={{
                    // images: [
                    //     {
                    //         height: 853,
                    //         url: '/photos/stargazing7.jpeg',
                    //         width: 1280
                    //     }
                    // ],
                    locale: 'ru'
                }}
            />

            <br />

            <EventUpcoming />

            <Container>
                <h1 className={'pageTitle'}>Астровыезд</h1>
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
                <PhotoLightboxOld
                    photos={galleryStargazing.map((image) => image.src)}
                    photoIndex={photoIndex}
                    showLightbox={showLightbox}
                    onCloseLightBox={handleHideLightbox}
                    onChangeIndex={setPhotoIndex}
                />
            </Container>

            <EventsList events={events} />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<StargazingPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            const { data } = await store.dispatch(
                API.endpoints?.eventsGetList.initiate()
            )

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    events: data?.items || []
                }
            }
        }
)

export default StargazingPage
