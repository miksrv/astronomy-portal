import { SITE_LINK } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import Link from 'next/link'
import React, { useState } from 'react'
import Gallery from 'react-photo-gallery'
import { Container } from 'simple-react-ui-kit'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import PhotoLightbox from '@/components/photo-lightbox'

import photoStargazing1 from '@/public/photos/stargazing-4.jpeg'
import photoStargazing2 from '@/public/photos/stargazing-5.jpeg'
import photoStargazing3 from '@/public/photos/stargazing-9.jpeg'
import photoStargazing4 from '@/public/photos/stargazing-10.jpeg'

const photosGallery = [
    photoStargazing1,
    photoStargazing2,
    photoStargazing3,
    photoStargazing4
]

type StargazingHowToPageProps = {}

const StargazingHowToPage: NextPage<StargazingHowToPageProps> = () => {
    const { t, i18n } = useTranslation()

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')

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
                title={t('stargazing-howto')}
                description={t('stargazing-howto-page.description')}
                canonical={`${canonicalUrl}stargazing/howto`}
                openGraph={{
                    images: [
                        {
                            height: 1467,
                            url: '/photos/stargazing-9.jpeg',
                            width: 2200
                        }
                    ],
                    siteName: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('stargazing-howto')}
                currentPage={t('stargazing-howto')}
                links={[
                    {
                        link: '/stargazing',
                        text: t('stargazing')
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ margin: 0 }}>
                    {t('stargazing-howto-page.unique_event')}
                </p>
                <h3 style={{ marginTop: 10 }}>
                    {t('stargazing-howto-page.event_announcement')}
                </h3>
                <p style={{ margin: 0 }}>
                    {t('stargazing-howto-page.event_announcement_text')}
                </p>
                <h3 style={{ marginTop: 10 }}>
                    {t('stargazing-howto-page.registration')}
                </h3>
                <p style={{ margin: 0 }}>
                    {t('stargazing-howto-page.registration_text')}
                </p>
                <h3 style={{ marginTop: 10 }}>
                    {t('stargazing-howto-page.location')}
                </h3>
                <p style={{ marginTop: 0 }}>
                    {t('stargazing-howto-page.location_text')}
                </p>
                <Gallery
                    photos={photosGallery}
                    columns={4}
                    direction={'row'}
                    targetRowHeight={200}
                    onClick={(event, photos) => {
                        handlePhotoClick(photos.index)
                    }}
                />
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('stargazing-howto-page.event_plan')}
                </h2>
                <ul style={{ listStyle: 'decimal', marginBottom: 0 }}>
                    <li style={{ marginBottom: '10px' }}>
                        <h3>{t('stargazing-howto-page.arrival')}</h3>
                        <p style={{ margin: 0 }}>
                            {t('stargazing-howto-page.arrival_text')}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3>{t('stargazing-howto-page.lecture')}</h3>
                        <p style={{ margin: 0 }}>
                            {t('stargazing-howto-page.lecture_text')}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3>{t('stargazing-howto-page.orientation')}</h3>
                        <p style={{ margin: 0 }}>
                            {t('stargazing-howto-page.orientation_text')}
                        </p>
                    </li>
                    <li>
                        <h3>
                            {t('stargazing-howto-page.telescope_observation')}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {t(
                                'stargazing-howto-page.telescope_observation_text'
                            )}
                        </p>
                    </li>
                </ul>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h3 style={{ marginTop: 10 }}>
                    {t('stargazing-howto-page.event_duration')}
                </h3>
                <p style={{ margin: 0 }}>
                    {t('stargazing-howto-page.event_duration_text')}
                </p>
                <h3 style={{ marginTop: 10 }}>
                    {t('stargazing-howto-page.recommendations')}
                </h3>
                <p style={{ margin: 0 }}>
                    {t('stargazing-howto-page.recommendations_text')}
                </p>
                <h3 style={{ marginTop: 10 }}>
                    {t('stargazing-howto-page.thematic_evenings')}
                </h3>
                <p style={{ marginTop: 0 }}>
                    {t('stargazing-howto-page.thematic_evenings_text')}
                </p>
                <p style={{ margin: 0 }}>
                    {t('stargazing-howto-page.faq')}
                    <Link
                        href={'/stargazing/faq'}
                        title={t('stargazing-faq')}
                        style={{ margin: '0 5px' }}
                    >
                        {t('stargazing-faq')}
                    </Link>
                    {t('stargazing-howto-page.telegram')}
                    <Link
                        href={'https://t.me/look_at_stars'}
                        style={{ marginLeft: '5px' }}
                        title={t('telegram')}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('near_space')}
                    </Link>
                    {'.'}
                </p>
            </Container>

            <PhotoLightbox
                photos={photosGallery.map((image) => ({
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

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (
            context
        ): Promise<GetServerSidePropsResult<StargazingHowToPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default StargazingHowToPage
