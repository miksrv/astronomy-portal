import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getCookie } from 'cookies-next'
import { Button, Container, Icon } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, setLocale, useAppSelector, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { hosts } from '@/api/constants'
import { AppFooter, AppLayout, AppToolbar, PhotoGallery, PhotoLightbox } from '@/components/common'
import { EventItemData, EventPhotoUploader } from '@/components/pages/stargazing'
import { formatDate } from '@/utils/dates'
import { createFullPhotoUrl, createPreviewPhotoUrl } from '@/utils/eventPhotos'
import { removeMarkdown, sliceText } from '@/utils/strings'

interface StargazingItemPageProps {
    eventId: string
    event: ApiModel.Event | null
    photos: ApiModel.EventPhoto[] | null
    eventsList: ApiModel.Event[] | null
}

const StargazingItemPage: NextPage<StargazingItemPageProps> = ({ eventId, event, photos, eventsList }) => {
    const { t } = useTranslation()

    const user = useAppSelector((state) => state.auth.user)

    // const { data: usersList } = API.useEventGetUsersListQuery(eventId, { skip: !eventId })

    const inputFileRef = useRef<HTMLInputElement>(undefined)

    const [localPhotos, setLocalPhotos] = useState<ApiModel.EventPhoto[]>([])
    const [uploadingPhotos, setUploadingPhotos] = useState<string[]>()
    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>()

    const title = `${t('menu.stargazing', 'Астровыезды')} - ${event?.title}`

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

        if (user?.role !== ApiModel.UserRole.ADMIN) {
            return
        }

        inputFileRef?.current?.click()
    }

    useEffect(() => {
        setLocalPhotos(photos ?? [])
    }, [photos])

    return (
        <AppLayout
            canonical={`stargazing/${event?.id}`}
            title={title}
            description={sliceText(removeMarkdown(event?.content || ''), 300)}
            openGraph={{
                images: [
                    {
                        height: 400,
                        url: `${hosts.stargazing}${event?.id}/${event?.coverFileName}_preview.${event?.coverFileExt}`,
                        width: 500
                    }
                ]
            }}
        >
            <AppToolbar
                title={title}
                currentPage={event?.title}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', 'Астровыезды')
                    }
                ]}
            />

            <EventItemData
                style={{ marginBottom: '10px' }}
                title={title}
                event={event || undefined}
            />

            <Container style={{ marginBottom: '10px' }}>
                <h2
                    className={'subTitle'}
                    style={{ marginTop: 0, textTransform: 'uppercase' }}
                >{`${event?.title} - ${t('pages.stargazing.photos-from-stargazing', 'Фотографии с астровыезда')}`}</h2>

                {user?.role === ApiModel.UserRole.ADMIN && (
                    <Button
                        disabled={!!uploadingPhotos?.length}
                        style={{ marginBottom: 20, width: '100%' }}
                        mode={'secondary'}
                        onClick={handleUploadPhotoClick}
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
                            alt: `${photo?.title} (${t('pages.stargazing.photo', 'Фото')} ${index + 1})`
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
                    title: `${photo.title} (${t('pages.stargazing.photo', 'Фото')} ${index + 1})`
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

            const token = await getCookie('token', { req: context.req, res: context.res })

            if (token) {
                store.dispatch(setSSRToken(token))
            }

            const { data: eventsData } = await store.dispatch(API.endpoints?.eventGetList.initiate())

            const { data: eventData, isError } = await store.dispatch(API.endpoints?.eventGetItem.initiate(eventId))

            const { data: eventPhotos } = await store.dispatch(
                API.endpoints?.eventGetPhotoList.initiate({
                    eventId
                })
            )

            if (isError) {
                return { notFound: true }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    event: eventData || null,
                    photos: eventPhotos?.items || [],
                    eventId: eventId,
                    eventsList: eventsData?.items || []
                }
            }
        }
)

export default StargazingItemPage
