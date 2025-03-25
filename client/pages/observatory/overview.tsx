import React, { useState } from 'react'
import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import { Button, Container } from 'simple-react-ui-kit'

import { API, ApiModel, SITE_LINK } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import ObjectPhotoTable from '@/components/object-photos-table'
import PhotoGallery from '@/components/photo-gallery'
import PhotoLightbox from '@/components/photo-lightbox'
import photoObservatory1 from '@/public/photos/observatory-1.jpeg'
import photoObservatory2 from '@/public/photos/observatory-2.jpeg'
import photoObservatory3 from '@/public/photos/observatory-3.jpeg'
import photoObservatory4 from '@/public/photos/observatory-4.jpeg'
import photoObservatory5 from '@/public/photos/observatory-5.jpeg'
import photoObservatory6 from '@/public/photos/observatory-6.jpeg'
import photoObservatory7 from '@/public/photos/observatory-7.jpeg'
import photoObservatory9 from '@/public/photos/observatory-9.jpeg'
import photoObservatory10 from '@/public/photos/observatory-10.jpeg'
import photoObservatory11 from '@/public/photos/observatory-11.jpeg'
import photoObservatory12 from '@/public/photos/observatory-12.jpeg'

const galleryObservatory = [photoObservatory3, photoObservatory7, photoObservatory5, photoObservatory6]

const galleryEquipment = [photoObservatory9, photoObservatory10, photoObservatory11, photoObservatory12]

const galleryControl = [photoObservatory1, photoObservatory2, photoObservatory4]

const allPhotos = [...galleryObservatory, ...galleryEquipment, ...galleryControl]

interface ObservatoryOverviewPageProps {
    photosList: ApiModel.Photo[]
}

const ObservatoryOverviewPage: NextPage<ObservatoryOverviewPageProps> = ({ photosList }) => {
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
                title={t('observatory-orenburg')}
                description={t('observatory-overview-page.intro')}
                canonical={`${canonicalUrl}observatory/overview`}
                openGraph={{
                    images: [
                        {
                            height: 854,
                            url: '/screenshots/observatory.jpg',
                            width: 1280
                        }
                    ],
                    siteName: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />
            <AppToolbar
                title={t('observatory-orenburg')}
                currentPage={t('observatory-orenburg')}
                links={[
                    {
                        link: '/observatory',
                        text: t('observatory')
                    }
                ]}
            />

            <p>{t('observatory-overview-page.intro')}</p>

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ marginTop: 0 }}>{t('observatory-overview-page.description-1')}</p>
                <p>{t('observatory-overview-page.description-2')}</p>

                <PhotoGallery
                    photos={galleryObservatory}
                    onClick={({ index }) => {
                        handlePhotoClick(index)
                    }}
                />

                <p>{t('observatory-overview-page.description-3')}</p>
                <p style={{ marginBottom: 0 }}>{t('observatory-overview-page.description-4')}</p>
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>{t('observatory-overview-page.equipment-title')}</h2>
                <p>{t('observatory-overview-page.equipment-description')}</p>
                <ul>
                    {(
                        t('observatory-overview-page.equipment-list', {
                            returnObjects: true
                        }) as any[]
                    ).map((item: any, index: number) => (
                        <li key={index}>
                            <h3>{item.title}</h3>
                            <div>{item.description}</div>
                        </li>
                    ))}
                </ul>
                <PhotoGallery
                    photos={galleryEquipment}
                    onClick={({ index }) => {
                        handlePhotoClick(index)
                    }}
                />
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>{t('observatory-overview-page.operating-principle-title')}</h2>
                <p>{t('observatory-overview-page.operating-principle-description-1')}</p>
                <p>{t('observatory-overview-page.operating-principle-description-2')}</p>
                <p>{t('observatory-overview-page.operating-principle-description-3')}</p>
                <ul>
                    {(
                        t('observatory-overview-page.operating-principle-list', {
                            returnObjects: true
                        }) as any[]
                    ).map((item: any, index: number) => (
                        <li key={index}>
                            <h3>{item.title}</h3>
                            <div>{item.description}</div>
                        </li>
                    ))}
                </ul>
                <p>{t('observatory-overview-page.operating-principle-description-4')}</p>
                <PhotoGallery
                    photos={galleryControl}
                    onClick={({ index }) => {
                        handlePhotoClick(index)
                    }}
                />
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>{t('observatory-overview-page.photos-and-data-title')}</h2>
                <p>
                    {t('observatory-overview-page.photos-and-data-part-1')}{' '}
                    <Link
                        href={'/photos'}
                        title={t('astrophoto')}
                    >
                        {t('observatory-overview-page.photos-and-data-part-photos')}
                    </Link>{' '}
                    {t('observatory-overview-page.photos-and-data-part-2')}{' '}
                    <Link
                        href={'/objects'}
                        title={t('objects')}
                    >
                        {t('observatory-overview-page.photos-and-data-part-objects')}
                    </Link>{' '}
                    {t('observatory-overview-page.photos-and-data-part-3')}
                </p>

                <ObjectPhotoTable photosList={photosList} />

                <Button
                    style={{ width: '100%' }}
                    size={'medium'}
                    mode={'secondary'}
                    link={'/photos'}
                    title={t('astrophoto')}
                >
                    {t('observatory-overview-page.photos-and-data-all-photos')}
                </Button>
            </Container>

            <PhotoLightbox
                photos={allPhotos.map((image) => ({
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
        async (context): Promise<GetServerSidePropsResult<ObservatoryOverviewPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            const { data: photos } = await store.dispatch(
                API.endpoints?.photosGetList.initiate({
                    limit: 5,
                    order: 'rand'
                })
            )

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...translations,
                    photosList: photos?.items || []
                }
            }
        }
)

export default ObservatoryOverviewPage
