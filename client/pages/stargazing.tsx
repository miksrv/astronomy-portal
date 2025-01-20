import { API, ApiModel } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import Link from 'next/link'
import React, { useState } from 'react'
import Gallery from 'react-photo-gallery'
import { Container, Icon, Message } from 'simple-react-ui-kit'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
// import EventUpcoming from '@/components/event-upcoming'
import EventsList from '@/components/events-list'
import PhotoLightbox from '@/components/photo-lightbox'

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
    const { t, i18n } = useTranslation()

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
                title={t('stargazing')}
                description={''}
                openGraph={{
                    // images: [
                    //     {
                    //         height: 853,
                    //         url: '/photos/stargazing7.jpeg',
                    //         width: 1280
                    //     }
                    // ],
                    siteName: t('look-at-the-stars'),
                    title: t('stargazing'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('stargazing')}
                currentPage={t('stargazing')}
            />

            {/*TODO*/}
            {/*<EventUpcoming />*/}

            <Link
                href={'https://t.me/nearspace'}
                className={'telegram-message'}
                title={t('telegram')}
                rel={'noindex nofollow'}
                target={'_blank'}
            >
                <Icon name={'Telegram'} /> {t('telegram-subscription-1')}
            </Link>

            <Container>
                <p style={{ marginTop: 0 }}>{t('stargazing-page.intro')}</p>
                <p>{t('stargazing-page.description')}</p>

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
                    photos={galleryStargazing.map((image) => ({
                        src: image.src,
                        width: image.width,
                        height: image.height,
                        title: ''
                    }))}
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
