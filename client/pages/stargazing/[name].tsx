import { API, ApiModel, SITE_LINK, useAppSelector } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { hosts } from '@/api/constants'
import { wrapper } from '@/api/store'
import { sliceText } from '@/functions/helpers'
import { removeMarkdown } from '@/tools/strings'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import Image from 'next/image'
import React, { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import Gallery from 'react-photo-gallery'
import { Button, Container } from 'simple-react-ui-kit'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import EventPhotoUploader from '@/components/event-photo-uploader/EventPhotoUploader'
import PhotoLightbox from '@/components/photo-lightbox'

interface StargazingItemPageProps {
    eventId: string
    event: ApiModel.Event | null
}

const StargazingItemPage: NextPage<StargazingItemPageProps> = ({
    eventId,
    event
}) => {
    const { t, i18n } = useTranslation()

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')

    const user = useAppSelector((state) => state.auth.user)

    const inputFileRef = useRef<HTMLInputElement>()

    const [localPhotos, setLocalPhotos] = useState<ApiModel.EventPhoto[]>([])
    const [uploadingPhotos, setUploadingPhotos] = useState<string[]>()
    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>()

    const title = `${t('stargazing')} - ${event?.title}`

    const handleCloseLightbox = () => {
        setShowLightbox(false)
    }

    const handlePhotoClick = (index: number) => {
        setPhotoIndex(index)
        setShowLightbox(true)
    }

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
                title={title}
                description={sliceText(
                    removeMarkdown(event?.content || ''),
                    300
                )}
                canonical={`${canonicalUrl}stargazing/${event?.id}`}
                openGraph={{
                    images: [
                        {
                            height: 400,
                            url: `${hosts.stargazing}${event?.id}/${event?.coverFileName}_preview.${event?.coverFileExt}`,
                            width: 500
                        }
                    ],
                    siteName: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={title}
                currentPage={event?.title}
                links={[
                    {
                        link: '/stargazing',
                        text: t('stargazing')
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <Image
                    style={{
                        objectFit: 'cover',
                        height: 'auto',
                        width: '100%'
                    }}
                    src={`${hosts.stargazing}${event?.id}/${event?.coverFileName}.${event?.coverFileExt}`}
                    alt={title}
                    width={1024}
                    height={768}
                />

                <br />

                <Markdown>{event?.content}</Markdown>
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2
                    className={'subTitle'}
                    style={{ marginTop: 0 }}
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

                <Gallery
                    photos={
                        localPhotos?.map((photo) => ({
                            height: photo.height,
                            src: `${hosts.stargazing}${eventId}/${photo.name}_preview.${photo?.ext}`,
                            width: photo.width
                        })) || []
                    }
                    columns={4}
                    direction={'row'}
                    targetRowHeight={200}
                    onClick={(event, photos) => {
                        handlePhotoClick(photos.index)
                    }}
                />

                <EventPhotoUploader
                    eventId={eventId}
                    fileInputRef={inputFileRef}
                    onSelectFiles={setUploadingPhotos}
                    onUploadPhoto={(photo) => {
                        setLocalPhotos([...localPhotos, photo])
                    }}
                />
            </Container>

            <PhotoLightbox
                photos={localPhotos?.map((photo, index) => ({
                    height: photo.height,
                    src: `${hosts.stargazing}${eventId}/${photo.name}.${photo?.ext}`,
                    width: photo.width,
                    title: `${event?.title} - Photo ${index}`
                }))}
                photoIndex={photoIndex}
                showLightbox={showLightbox}
                onCloseLightBox={handleCloseLightbox}
            />

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
