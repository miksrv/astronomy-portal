import React, { useEffect, useMemo, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { GetServerSidePropsResult, NextPage } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { Button, Container, Icon } from 'simple-react-ui-kit'

import { API, ApiModel, SITE_LINK, useAppSelector } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { hosts } from '@/api/constants'
import { wrapper } from '@/api/store'
import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import EventPhotoUploader from '@/components/event-photo-uploader/EventPhotoUploader'
import PhotoGallery from '@/components/photo-gallery'
import PhotoLightbox from '@/components/photo-lightbox'
import { createFullPhotoUrl, createPreviewPhotoUrl } from '@/tools/eventPhotos'
import { formatDate, sliceText } from '@/tools/helpers'
import { removeMarkdown } from '@/tools/strings'

interface StargazingItemPageProps {
    eventId: string
    event: ApiModel.Event | null
    eventsList: ApiModel.Event[] | null
}

const StargazingItemPage: NextPage<StargazingItemPageProps> = ({ eventId, event, eventsList }) => {
    const { t, i18n } = useTranslation()

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')

    const user = useAppSelector((state) => state.auth.user)

    const inputFileRef = useRef<HTMLInputElement>(undefined)

    const [localPhotos, setLocalPhotos] = useState<ApiModel.EventPhoto[]>([])
    const [uploadingPhotos, setUploadingPhotos] = useState<string[]>()
    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>()

    const title = `${t('stargazing')} - ${event?.title}`

    const adjacentEvents = useMemo(() => {
        const sortedEvents = [...(eventsList || [])].sort((a, b) => {
            const dateA = a?.date?.date ? new Date(a.date.date).getTime() : 0
            const dateB = b?.date?.date ? new Date(b.date.date).getTime() : 0
            return dateA - dateB
        })

        const currentIndex = sortedEvents?.findIndex(({ id }) => id === eventId)

        if (currentIndex === -1) {
            return { previousEvent: undefined, nextEvent: undefined }
        }

        const previousEvent =
            !!sortedEvents?.length && currentIndex < sortedEvents?.length - 1 ? sortedEvents?.[currentIndex + 1] : null

        const nextEvent = currentIndex > 0 ? sortedEvents?.[currentIndex - 1] : null

        return { previousEvent, nextEvent }
    }, [eventsList, eventId])

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
                description={sliceText(removeMarkdown(event?.content || ''), 300)}
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
                >{`${event?.title} - ${t('photos-from-stargazing')}`}</h2>

                {user?.role === 'admin' && (
                    <Button
                        onClick={handleUploadPhotoClick}
                        disabled={!!uploadingPhotos?.length}
                        style={{ marginBottom: 20 }}
                    >
                        {!uploadingPhotos?.length ? 'Загрузить фотографии' : `Загрузка ${uploadingPhotos?.length} фото`}
                    </Button>
                )}

                <PhotoGallery
                    photos={
                        localPhotos?.map((photo, index) => ({
                            height: photo.height,
                            src: createPreviewPhotoUrl(photo),
                            width: photo.width,
                            alt: `${photo?.title} (${t('photo')} ${index + 1})`
                        })) || []
                    }
                    onClick={({ index }) => {
                        handlePhotoClick(index)
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
                    src: createFullPhotoUrl(photo),
                    width: photo.width,
                    title: `${photo.title} (${t('photo')} ${index + 1})`
                }))}
                photoIndex={photoIndex}
                showLightbox={showLightbox}
                onCloseLightBox={handleCloseLightbox}
            />

            <section className={'footerLinks'}>
                {adjacentEvents?.previousEvent && (
                    <Link
                        href={`/stargazing/${adjacentEvents?.previousEvent?.id}`}
                        title={adjacentEvents?.previousEvent?.title}
                    >
                        <Icon name={'KeyboardLeft'} />
                        <div className={'linkName'}>
                            <div>{adjacentEvents?.previousEvent?.title}</div>
                            <div className={'date'}>
                                {formatDate(adjacentEvents?.previousEvent?.date?.date, 'D MMMM YYYY')}
                            </div>
                        </div>
                    </Link>
                )}

                {adjacentEvents?.nextEvent && (
                    <Link
                        href={`/stargazing/${adjacentEvents?.nextEvent?.id}`}
                        title={adjacentEvents?.nextEvent?.title}
                    >
                        <div className={'linkName'}>
                            <div>{adjacentEvents?.nextEvent?.title}</div>
                            <div className={'date'}>
                                {formatDate(adjacentEvents?.nextEvent?.date?.date, 'D MMMM YYYY')}
                            </div>
                        </div>
                        <Icon name={'KeyboardRight'} />
                    </Link>
                )}
            </section>

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<StargazingItemPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const eventId = context.params?.name

            if (typeof eventId !== 'string') {
                return { notFound: true }
            }

            store.dispatch(setLocale(locale))

            const { data: eventsData } = await store.dispatch(API.endpoints?.eventGetList.initiate())

            const { data, isError } = await store.dispatch(API.endpoints?.eventGetItem.initiate(eventId))

            if (isError) {
                return { notFound: true }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    event: data || null,
                    eventId: eventId,
                    eventsList: eventsData?.items || []
                }
            }
        }
)

export default StargazingItemPage
