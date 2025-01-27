import { API, ApiModel, useAppSelector } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { sliceText } from '@/functions/helpers'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import Image from 'next/image'
import React, { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { Button, Container } from 'simple-react-ui-kit'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
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
    const { t, i18n } = useTranslation()

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
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('stargazing-rules')}
                currentPage={t('stargazing-rules')}
                links={[
                    {
                        link: '/stargazing',
                        text: t('stargazing')
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <Image
                    className={'stargazingImage'}
                    src={`${process.env.NEXT_PUBLIC_API_HOST}${event?.cover}`}
                    alt={`Астровыезд: ${event?.title}`}
                    width={1024}
                    height={768}
                    style={{ width: '100%' }}
                />

                <br />

                <Markdown>{event?.content}</Markdown>
            </Container>

            {(!!localPhotos?.length || user?.role === 'admin') && (
                <Container style={{ marginBottom: '10px' }}>
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

                    <AppFooter />
                </Container>
            )}

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<StargazingItemPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const eventId = context.params?.name

            if (typeof eventId !== 'string') {
                return { notFound: true }
            }

            store.dispatch(setLocale(locale))

            const { data, isError } = await store.dispatch(
                API.endpoints?.eventGetItem.initiate(eventId)
            )

            if (isError) {
                return { notFound: true }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    event: data || null,
                    eventId: eventId
                }
            }
        }
)

export default StargazingItemPage
