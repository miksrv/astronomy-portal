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

import photoSidewalk1 from '@/public/photos/sidewalk-asrtronomy-1.jpeg'
import photoSidewalk2 from '@/public/photos/sidewalk-asrtronomy-2.jpeg'
import photoSidewalk3 from '@/public/photos/sidewalk-asrtronomy-3.jpeg'
import photoSidewalk4 from '@/public/photos/sidewalk-asrtronomy-4.jpeg'

const gallerySidewalk = [
    photoSidewalk1,
    photoSidewalk2,
    photoSidewalk3,
    photoSidewalk4
]

type StargazingWherePageProps = {}

const StargazingWherePage: NextPage<StargazingWherePageProps> = () => {
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
                title={t('stargazing-where')}
                description={t('stargazing-where-page.description')}
                canonical={`${canonicalUrl}stargazing/where`}
                openGraph={{
                    images: [
                        {
                            height: 960,
                            url: '/photos/sidewalk-asrtronomy-1.jpeg',
                            width: 1280
                        }
                    ],
                    siteName: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('stargazing-where')}
                currentPage={t('stargazing-where')}
                links={[
                    {
                        link: '/stargazing',
                        text: t('stargazing')
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ marginTop: 0 }}>
                    {t('stargazing-where-page.intro')}
                </p>
                <p>
                    {t('stargazing-where-page.announcement-1')}
                    <Link
                        style={{ margin: '0 5px' }}
                        href={'https://t.me/nearspace'}
                        title={t('telegram')}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('stargazing-where-page.telegram-channel')}
                    </Link>
                    {t('stargazing-where-page.announcement-2')}
                </p>
                <Gallery
                    photos={gallerySidewalk}
                    columns={4}
                    direction={'row'}
                    targetRowHeight={200}
                    onClick={(event, photos) => {
                        handlePhotoClick(gallerySidewalk.length + photos.index)
                    }}
                />
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('stargazing-where-page.what-you-can-see-title')}
                </h2>
                <p>{t('stargazing-where-page.what-you-can-see-description')}</p>
                <ul>
                    <li>{t('stargazing-where-page.what-you-can-see-1')}</li>
                    <li>{t('stargazing-where-page.what-you-can-see-2')}</li>
                    <li>{t('stargazing-where-page.what-you-can-see-3')}</li>
                    <li>{t('stargazing-where-page.what-you-can-see-4')}</li>
                </ul>
                <p style={{ marginBottom: 0 }}>
                    {t('stargazing-where-page.what-you-can-see-conclusion')}
                </p>
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('stargazing-where-page.want-to-see-more')}
                </h2>
                <p>{t('stargazing-where-page.want-to-see-description-1')}</p>
                <p>{t('stargazing-where-page.want-to-see-description-2')}</p>
                <p style={{ marginBottom: 0 }}>
                    {t('stargazing-where-page.want-to-see-description-3')}
                </p>
            </Container>

            <PhotoLightbox
                photos={gallerySidewalk.map((image) => ({
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
        ): Promise<GetServerSidePropsResult<StargazingWherePageProps>> => {
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

export default StargazingWherePage
