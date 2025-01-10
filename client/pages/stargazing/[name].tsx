import { API, ApiModel, useAppSelector } from '@/api'
import { wrapper } from '@/api/store'
import { sliceText } from '@/functions/helpers'
import { GetServerSidePropsResult, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import Image from 'next/image'
import React, { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { Button, Container } from 'simple-react-ui-kit'

import AppLayout from '@/components/app-layout'
import EventPhotoUploader from '@/components/event-photo-uploader/EventPhotoUploader'
import PhotoGallery from '@/components/photo-gallery'

interface StargazingItemPageProps {
    eventId: string
    event: ApiModel.Event | null
}

const StargazingItemPage: NextPage<StargazingItemPageProps> = ({
    eventId,
    event
}) => {
    const user = useAppSelector((state) => state.auth.user)

    const inputFileRef = useRef<HTMLInputElement>()

    const [localPhotos, setLocalPhotos] = useState<ApiModel.EventPhoto[]>([])
    const [uploadingPhotos, setUploadingPhotos] = useState<string[]>()

    const handleUploadPhotoClick = (event: React.MouseEvent | undefined) => {
        event?.preventDefault()

        if (user?.role !== 'admin') {
            return
        }

        inputFileRef?.current?.click()
    }

    useEffect(() => {
        setLocalPhotos(event?.photos ?? [])
    }, [event?.photos])

    return (
        <AppLayout>
            <NextSeo
                title={`Астровыезд - ${event?.title}`}
                description={sliceText(event?.content ?? '', 300)}
                openGraph={{
                    images: [
                        {
                            height: 743,
                            url: `${process.env.NEXT_PUBLIC_API_HOST}${event?.cover}`,
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />

            <Container>
                <h1
                    className={'pageTitle'}
                >{`Астровыезд - ${event?.title}`}</h1>

                <Image
                    className={'stargazingImage'}
                    src={`${process.env.NEXT_PUBLIC_API_HOST}${event?.cover}`}
                    alt={`Астровыезд: ${event?.title}`}
                    width={1024}
                    height={768}
                    style={{ width: '100%' }}
                />

                <br />
                <br />

                <Markdown>{event?.content}</Markdown>
            </Container>

            {(!!localPhotos?.length || user?.role === 'admin') && (
                <Container>
                    <h2
                        className={'subTitle'}
                    >{`Фотографии с астровыезда - ${event?.title}`}</h2>

                    {user?.role === 'admin' && (
                        <Button
                            onClick={handleUploadPhotoClick}
                            disabled={!!uploadingPhotos?.length}
                            style={{ marginBottom: 20 }}
                        >
                            {!uploadingPhotos?.length
                                ? 'Загрузить фотографии'
                                : `Загрузка ${uploadingPhotos?.length} фото`}
                        </Button>
                    )}

                    <PhotoGallery photos={localPhotos} />

                    <EventPhotoUploader
                        eventId={eventId}
                        fileInputRef={inputFileRef}
                        onSelectFiles={setUploadingPhotos}
                        onUploadPhoto={(photo) => {
                            setLocalPhotos([...localPhotos, photo])
                        }}
                    />
                </Container>
            )}
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<StargazingItemPageProps>> => {
            const eventId = context.params?.name

            if (typeof eventId !== 'string') {
                return { notFound: true }
            }

            const { data, isError } = await store.dispatch(
                API.endpoints?.eventGetItem.initiate(eventId)
            )

            if (isError) {
                return { notFound: true }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    event: data || null,
                    eventId: eventId
                }
            }
        }
)

export default StargazingItemPage
