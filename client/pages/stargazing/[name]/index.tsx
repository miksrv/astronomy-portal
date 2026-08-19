import React, { useEffect, useMemo, useState } from 'react'
import { getCookie } from 'cookies-next'
import { Button, Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'
import { JsonLdScript } from 'next-seo'

import { API, ApiModel, useAppSelector, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { hosts } from '@/api/constants'
import { AppFooter, AppLayout, AppToolbar, PhotoGallery, PhotoLightbox, PrevNextNav } from '@/components/common'
import { EventItemData, EventPhotoFilter, EventReviews } from '@/components/pages/stargazing'
import { PHOTOS_PAGE_SIZE, REVIEWS_PAGE_SIZE } from '@/utils/constants'
import { formatDate } from '@/utils/dates'
import { buildEventJsonLd } from '@/utils/eventJsonLd'
import { createFullPhotoUrl, createPreviewPhotoUrl } from '@/utils/eventPhotos'
import { hasAnyPermission, hasPermission } from '@/utils/permissions'
import { initSSRLocale } from '@/utils/ssrLocale'
import { removeMarkdown, sliceText } from '@/utils/strings'

import styles from '../styles.module.sass'

// Admin-only, dynamically imported so it never enters the bundle for regular visitors.
const EventPhotoUploadDialog = dynamic(
    () => import('@/components/pages/stargazing/event-photo-upload-dialog').then((mod) => mod.EventPhotoUploadDialog),
    { ssr: false }
)

interface StargazingItemPageProps {
    eventId: string
    event: ApiModel.Event | null
    eventsList: ApiModel.Event[] | null
}

const StargazingItemPage: NextPage<StargazingItemPageProps> = ({ eventId, event, eventsList }) => {
    const { t } = useTranslation()
    const router = useRouter()

    const user = useAppSelector((state) => state.auth.user)

    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState<boolean>(false)
    const [selectedPhotographer, setSelectedPhotographer] = useState<string | undefined>(undefined)
    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>()

    // Only the first PHOTOS_PAGE_SIZE photos are fetched up front - an event
    // can have up to ~400, and this is also what lets that first page be
    // present in the SSR HTML (and JSON-LD) instead of only appearing after
    // client-side hydration. "Смотреть все" (below) bumps this straight to the
    // full total and re-fetches everything in one request, rather than
    // growing the grid in batches while scrolling - simpler, and it avoids the
    // grid visibly shifting mid-scroll; the one-time cost of laying out the
    // rest at once only happens on a deliberate click, not while casually
    // scrolling.
    const [pageLimit, setPageLimit] = useState(PHOTOS_PAGE_SIZE)

    // Reset back to the first, unfiltered page whenever the event itself
    // changes, so state from a previous event id can't leak in across a
    // client-side (non-full-reload) navigation.
    useEffect(() => {
        setPageLimit(PHOTOS_PAGE_SIZE)
        setSelectedPhotographer(undefined)
    }, [eventId])

    // Switching the photographer filter swaps the underlying (server-side
    // filtered) list entirely - back to the first page for the new filter,
    // rather than keeping "show all" carried over from a different photographer.
    useEffect(() => {
        setPageLimit(PHOTOS_PAGE_SIZE)
    }, [selectedPhotographer])

    const title = event?.title || t('menu.stargazing', 'Астровыезды')

    const coverImageUrl =
        event?.coverFileName && event?.coverFileExt
            ? `${hosts.stargazing}${event.id}/${event.coverFileName}.${event.coverFileExt}`
            : undefined

    // Same query args as the SSR prefetch below - the first page (no
    // photographer filter) matches exactly what getServerSideProps dispatched,
    // so this reuses that cached result with no extra request or loading
    // flash. Clicking "Смотреть все" (below) just re-requests this same query
    // with a bigger `limit` - a distinct, one-shot cache entry, not a growing
    // one.
    const { data: photosData, isFetching: isPhotosFetching } = API.useEventGetPhotoListQuery({
        eventId,
        limit: pageLimit,
        photographer: selectedPhotographer
    })

    const photos = photosData?.items ?? []
    const totalPhotos = photosData?.total ?? 0
    const hasMorePhotos = photos.length < totalPhotos
    const isInitialPhotosLoading = isPhotosFetching && photos.length === 0
    // Always the event's full, unfiltered photographer list (see the backend's
    // `Events::photos()`) - so the filter chips and upload dialog autocomplete
    // aren't missing anyone whose photos happen to live outside the currently
    // loaded/filtered page.
    const photographers = photosData?.photographers
    const isLoadingAllPhotos = isPhotosFetching && pageLimit > PHOTOS_PAGE_SIZE

    // Same query args as the SSR prefetch below and `EventReviews` itself, so this
    // reuses the cached first page instead of firing an extra request.
    const { data: reviewsData } = API.useCommentsGetListQuery({
        entityId: eventId,
        entityType: 'event',
        limit: REVIEWS_PAGE_SIZE,
        offset: 0
    })

    const eventJsonLd = event
        ? buildEventJsonLd(event, reviewsData ? { items: reviewsData.items, total: reviewsData.total } : undefined)
        : null

    // Rich, unique per-photo text - used as the `<img alt>` on both the
    // gallery thumbnails and the lightbox (accessibility/SEO), independent of
    // whatever's shown in the lightbox's on-screen caption below.
    const getPhotoCaption = (photo: ApiModel.EventPhoto, index: number): string =>
        photo.photographer
            ? t('pages.stargazing.photo-caption-with-photographer', '{{eventTitle}} — фото от {{photographer}}', {
                  eventTitle: title,
                  photographer: photo.photographer
              })
            : t('pages.stargazing.photo-caption', '{{eventTitle}} (Фото №{{number}})', {
                  eventTitle: title,
                  number: index + 1
              })

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

        if (!hasPermission(user, ApiModel.Permission.EVENTS_GALLERY_UPLOAD)) {
            return
        }

        setIsUploadDialogOpen(true)
    }

    const handleShowAllPhotos = () => {
        if (isLoadingAllPhotos || !totalPhotos) {
            return
        }

        setPageLimit(totalPhotos)
    }

    return (
        <AppLayout
            canonical={`stargazing/${event?.id}`}
            title={title}
            description={sliceText(removeMarkdown(event?.content || ''), 160)}
            openGraph={{
                images: coverImageUrl ? [{ url: coverImageUrl }] : undefined
            }}
        >
            <JsonLdScript
                scriptKey={'stargazing-event'}
                data={eventJsonLd}
            />
            <AppToolbar
                title={title}
                currentPage={event?.title}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', 'Астровыезды')
                    }
                ]}
            >
                {hasAnyPermission(user, [
                    ApiModel.Permission.EVENTS_UPDATE,
                    ApiModel.Permission.EVENTS_STATISTIC,
                    ApiModel.Permission.EVENTS_GALLERY_UPLOAD
                ]) && (
                    <>
                        {hasPermission(user, ApiModel.Permission.EVENTS_GALLERY_UPLOAD) && (
                            <Button
                                disabled={isUploadDialogOpen}
                                icon={'Download'}
                                mode={'secondary'}
                                onClick={handleUploadPhotoClick}
                            >
                                {t('pages.stargazing.upload-photos-button', 'Загрузить фотографии')}
                            </Button>
                        )}

                        {hasPermission(user, ApiModel.Permission.EVENTS_UPDATE) && (
                            <Button
                                icon={'Pencil'}
                                mode={'secondary'}
                                label={t('common.edit', 'Редактировать')}
                                disabled={!eventId}
                                onClick={() => router.push(`/stargazing/form?id=${eventId}`)}
                            />
                        )}

                        {hasPermission(user, ApiModel.Permission.EVENTS_STATISTIC) && (
                            <Button
                                icon={'BarChart'}
                                mode={'secondary'}
                                onClick={() => router.push(`/stargazing/${eventId}/statistic`)}
                            />
                        )}
                    </>
                )}
            </AppToolbar>

            <EventItemData
                title={title}
                event={event || undefined}
            />

            <h2>
                {t('pages.stargazing.photos-from-stargazing', 'Фотографии с мероприятия')}

                {hasMorePhotos && (
                    <Button
                        mode={'link'}
                        className={styles.showMorePhotos}
                        onClick={handleShowAllPhotos}
                        label={
                            isLoadingAllPhotos
                                ? t('pages.stargazing.photos-loading-more', 'Загрузка ещё фотографий…')
                                : t('pages.stargazing.photos-show-all', 'Смотреть все ({{total}})', {
                                      total: totalPhotos
                                  })
                        }
                    />
                )}
            </h2>

            <EventPhotoFilter
                photographers={photographers}
                selected={selectedPhotographer}
                onChange={setSelectedPhotographer}
            />

            {photos.length > 0 ? (
                <PhotoGallery
                    photos={photos.map((photo, index) => ({
                        height: photo.height,
                        src: createPreviewPhotoUrl(photo),
                        width: photo.width,
                        alt: getPhotoCaption(photo, index)
                    }))}
                    onClick={({ index }) => {
                        handlePhotoClick(index)
                    }}
                />
            ) : (
                !isInitialPhotosLoading && (
                    <Container>
                        <p className={styles.noPhotos}>
                            {t(
                                'pages.stargazing.no-photos',
                                'Фотографии с этого события ещё не загружены. Загляните позже!'
                            )}
                        </p>
                    </Container>
                )
            )}

            {hasPermission(user, ApiModel.Permission.EVENTS_GALLERY_UPLOAD) && (
                <EventPhotoUploadDialog
                    eventId={eventId}
                    photographers={photographers}
                    open={isUploadDialogOpen}
                    onClose={() => setIsUploadDialogOpen(false)}
                    onUploadPhoto={() => {
                        // The upload mutation invalidates this event's EventPhotos
                        // tag, so RTK Query refetches the active page(s) in the
                        // background - reset to the small first page so the
                        // freshly uploaded photo is visible right away instead of
                        // landing wherever a "show all" fetch used to end.
                        setPageLimit(PHOTOS_PAGE_SIZE)
                    }}
                />
            )}

            <PhotoLightbox
                photos={photos.map((photo, index) => ({
                    alt: getPhotoCaption(photo, index),
                    height: photo.height,
                    preview: createPreviewPhotoUrl(photo),
                    src: createFullPhotoUrl(photo),
                    title,
                    width: photo.width
                }))}
                photoIndex={photoIndex}
                showLightbox={showLightbox}
                onCloseLightBox={handleCloseLightbox}
            />

            <h2>{t('pages.stargazing.reviews', 'Отзывы участников')}</h2>

            <EventReviews eventId={eventId} />

            <PrevNextNav
                prev={
                    adjacentEvents?.previousEvent
                        ? {
                              href: `/stargazing/${adjacentEvents.previousEvent.id}`,
                              title: adjacentEvents.previousEvent.title,
                              subtitle: formatDate(adjacentEvents.previousEvent.date?.date, 'D MMMM YYYY')
                          }
                        : null
                }
                next={
                    adjacentEvents?.nextEvent
                        ? {
                              href: `/stargazing/${adjacentEvents.nextEvent.id}`,
                              title: adjacentEvents.nextEvent.title,
                              subtitle: formatDate(adjacentEvents.nextEvent.date?.date, 'D MMMM YYYY')
                          }
                        : null
                }
            />

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<StargazingItemPageProps>> => {
            const { translations } = await initSSRLocale(store, context)
            const eventId = context.params?.name

            if (typeof eventId !== 'string') {
                return { notFound: true }
            }

            const token = await getCookie('token', { req: context.req, res: context.res })

            if (token) {
                store.dispatch(setSSRToken(token))
            }

            const { data: eventsData } = await store.dispatch(API.endpoints?.eventGetList.initiate())

            const { data: eventData, isError } = await store.dispatch(API.endpoints?.eventGetItem.initiate(eventId))

            // Prefetch only the first page of the gallery (not the whole,
            // potentially hundreds-strong list) so it's part of the initial HTML
            // and JSON-LD instead of only appearing after client-side hydration -
            // the rest loads via the "Смотреть все" button on the client. Args
            // match exactly what the component requests on mount, so the client
            // hook reuses this cached entry with no extra request.
            await store.dispatch(
                API.endpoints?.eventGetPhotoList.initiate({
                    eventId,
                    limit: PHOTOS_PAGE_SIZE
                })
            )

            // Prefetch the first page of reviews so it's part of the initial HTML
            // instead of only appearing after client-side hydration (bad for SEO -
            // crawlers that don't execute JS never see review text at all, and
            // Google's JS-render pass is delayed). The query args match exactly
            // what `EventReviews` requests on mount, so the client hook reuses this
            // cached entry with no extra request or loading flash.
            await store.dispatch(
                API.endpoints?.commentsGetList.initiate({
                    entityId: eventId,
                    entityType: 'event',
                    limit: REVIEWS_PAGE_SIZE,
                    offset: 0
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
                    eventId: eventId,
                    eventsList: eventsData?.items || []
                }
            }
        }
)

export default StargazingItemPage
