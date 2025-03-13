import { API, ApiModel, SITE_LINK, useAppSelector } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { createFullPhotoUrl, createPreviewPhotoUrl } from '@/tools/eventPhotos'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useState } from 'react'
import Gallery from 'react-photo-gallery'
import { Button, Container, Icon } from 'simple-react-ui-kit'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
// import EventUpcoming from '@/components/event-upcoming'
import EventsList from '@/components/events-list'
import PhotoLightbox from '@/components/photo-lightbox'

interface StargazingPageProps {
    events: ApiModel.Event[]
    photos: ApiModel.EventPhoto[]
}

// TODO Вместо галерии постоянных изображений тут, использовать загруженные фото астровыездов из API
const StargazingPage: NextPage<StargazingPageProps> = ({ events, photos }) => {
    const { t, i18n } = useTranslation()
    const router = useRouter()

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>(0)

    const handlePhotoClick = (index: number) => {
        setPhotoIndex(index)
        setShowLightbox(true)
    }

    const handleHideLightbox = () => {
        setShowLightbox(false)
    }

    const handleCreate = () => {
        router.push('/stargazing/form')
    }

    return (
        <AppLayout>
            <NextSeo
                title={t('stargazing')}
                description={t('description-stargazing')}
                canonical={`${canonicalUrl}stargazing`}
                openGraph={{
                    images: [
                        {
                            height: 853,
                            url: '/photos/stargazing-1.jpeg',
                            width: 1280
                        }
                    ],
                    siteName: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('stargazing')}
                currentPage={t('stargazing')}
            >
                {userRole === 'admin' && (
                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        size={'medium'}
                        label={t('add')}
                        onClick={handleCreate}
                    />
                )}
            </AppToolbar>

            {/*TODO*/}
            {/*<EventUpcoming />*/}

            <Link
                href={'https://t.me/look_at_stars'}
                className={'telegram-message'}
                title={t('telegram')}
                rel={'noindex nofollow'}
                target={'_blank'}
            >
                <Icon name={'Telegram'} /> {t('telegram-subscription')}
            </Link>

            <Container>
                <p style={{ marginTop: 0 }}>{t('stargazing-page.intro')}</p>
                <p>{t('stargazing-page.description')}</p>

                <ul>
                    <li>
                        <Link
                            href={'/stargazing/rules'}
                            title={t('stargazing-rules')}
                        >
                            {t('stargazing-rules')}
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={'/stargazing/howto'}
                            title={t('stargazing-howto')}
                        >
                            {t('stargazing-howto')}
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={'/stargazing/where'}
                            title={t('stargazing-where')}
                        >
                            {t('stargazing-where')}
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={'/stargazing/faq'}
                            title={t('stargazing-faq')}
                        >
                            {t('stargazing-faq')}
                        </Link>
                    </li>
                </ul>

                <Gallery
                    photos={
                        photos?.map((photo, index) => ({
                            height: photo.height,
                            src: createPreviewPhotoUrl(photo),
                            width: photo.width,
                            alt: `${photo?.title} (${t('photo')} ${index + 1})`
                        })) || []
                    }
                    columns={4}
                    direction={'row'}
                    targetRowHeight={200}
                    onClick={(event, photos) => {
                        handlePhotoClick(photos.index)
                    }}
                />

                <PhotoLightbox
                    photos={
                        photos?.map((photo, index) => ({
                            height: photo.height,
                            src: createFullPhotoUrl(photo),
                            width: photo.width,
                            title: `${photo?.title} (${t('photo')} ${
                                index + 1
                            })`
                        })) || []
                    }
                    photoIndex={photoIndex}
                    showLightbox={showLightbox}
                    onCloseLightBox={handleHideLightbox}
                    onChangeIndex={setPhotoIndex}
                />
            </Container>

            <EventsList events={events} />

            <AppFooter />
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

            const { data: eventsData } = await store.dispatch(
                API.endpoints?.eventGetList.initiate()
            )

            const { data: photosData } = await store.dispatch(
                API.endpoints?.eventGetPhotoList.initiate({
                    limit: 4,
                    order: 'rand'
                })
            )

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    events: eventsData?.items || [],
                    photos: photosData?.items || []
                }
            }
        }
)

export default StargazingPage
