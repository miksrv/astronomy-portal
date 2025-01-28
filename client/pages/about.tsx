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
import { Container, Icon } from 'simple-react-ui-kit'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import PhotoLightbox from '@/components/photo-lightbox'
import Team from '@/components/project-team'

import photoAboutMe1 from '@/public/photos/about-me-1.jpeg'
import photoAboutMe2 from '@/public/photos/about-me-2.jpeg'
import photoAboutMe3 from '@/public/photos/about-me-3.jpeg'
import photoAboutMe4 from '@/public/photos/about-me-4.jpeg'
import photoObservatory1 from '@/public/photos/observatory-1.jpeg'
import photoObservatory2 from '@/public/photos/observatory-2.jpeg'
import photoObservatory3 from '@/public/photos/observatory-3.jpeg'
import photoObservatory4 from '@/public/photos/observatory-4.jpeg'
import photoObservatory5 from '@/public/photos/observatory-5.jpeg'
import photoObservatory6 from '@/public/photos/observatory-6.jpeg'
import photoObservatory7 from '@/public/photos/observatory-7.jpeg'
import photoObservatory8 from '@/public/photos/observatory-8.jpeg'
import photoStargazing1 from '@/public/photos/stargazing-1.jpeg'
import photoStargazing2 from '@/public/photos/stargazing-2.jpeg'
import photoStargazing3 from '@/public/photos/stargazing-3.jpeg'
import photoStargazing4 from '@/public/photos/stargazing-4.jpeg'
import photoStargazing5 from '@/public/photos/stargazing-5.jpeg'
import photoStargazing6 from '@/public/photos/stargazing-6.jpeg'
import photoStargazing7 from '@/public/photos/stargazing-7.jpeg'
import photoStargazing8 from '@/public/photos/stargazing-8.jpeg'

const galleryAboutMe = [
    photoAboutMe1,
    photoAboutMe2,
    photoAboutMe3,
    photoAboutMe4
]

const galleryObservatory = [
    photoObservatory3,
    photoObservatory8,
    photoObservatory7,
    photoObservatory5,
    photoObservatory6,
    photoObservatory4,
    photoObservatory1,
    photoObservatory2
]

const galleryStargazing = [
    photoStargazing1,
    photoStargazing2,
    photoStargazing3,
    photoStargazing4,
    photoStargazing5,
    photoStargazing6,
    photoStargazing7,
    photoStargazing8
]

const contributors1: string[] = [
    'Марина Станиславовна С.',
    'Игнат Евгеньевич П. (Хорошим людям, делающим хорошие дела)',
    'Алексей Валерьевич К. (Пусть у вас все получится!)',
    'Татьяна Анатольевна А.',
    'Андрей Юрьевич Ч.',
    'Дарья Викторовна К.',
    'Константин Константинович Ш.',
    'Аноним* (500 руб.)',
    'Виктория Е.(Спасибо за то что вы делаете!)',
    'Марина Николаевна М.',
    'Михаил Алексеевич К.',
    'Михаил Владимирович Х.',
    'Елена Михайловна Ш. (К звездам)',
    'Леонид Викторович Д. (На OpenScope)',
    'Сергей К. (На обсерваторию)',
    'Антон Владимирович К. (На оборудование)',
    'Николай Ж. (Пока останутся два дурака и кусочек сцены, театр не погибнет. Желаю удачи!)',
    'Вячеслав Владимирович В. (На обсерваторию)',
    'Александр Анатольевич А.',
    'Аноним* (Зачисление 500 руб. "OSB")',
    'Ольга Сергеевна Е. (На Мечту! и любовь к звездам)',
    'Инесса Николаевна К.'
]

const contributors2: string[] = [
    'Селищев Дмитрий (Arduino, AVR)',
    'Андреев Валентин (Arduino, AVR)',
    'Плаксин Иван (IP Camera)',
    'Тонких Антон (Java backend)',
    'Сергеев Вадим',
    'Ильин Сергей',
    'Владимир Уваров (Сетевой коммутатор D-Link)'
]

type AboutPageProps = {}

const AboutPage: NextPage<AboutPageProps> = () => {
    const { t, i18n } = useTranslation()

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')

    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>(0)

    const allPhotos = [
        ...galleryAboutMe,
        ...galleryStargazing,
        ...galleryObservatory
    ]

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
                title={t('about')}
                description={t('about-page.description')}
                canonical={`${canonicalUrl}about`}
                openGraph={{
                    images: [
                        {
                            height: 853,
                            url: '/photos/stargazing-2.jpeg',
                            width: 1280
                        }
                    ],
                    siteName: t('look-at-the-stars'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

            <AppToolbar
                title={t('about')}
                currentPage={t('about')}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ marginTop: 0 }}>
                    {t('about-page.my-name')}
                    <Link
                        href={'https://miksoft.pro'}
                        style={{ marginLeft: '5px' }}
                        title={t('about-page.misha')}
                        target={'_blank'}
                    >
                        {t('about-page.misha')}
                    </Link>
                    {t('about-page.intro')}
                </p>
                <Gallery
                    photos={galleryAboutMe}
                    columns={4}
                    direction={'row'}
                    targetRowHeight={200}
                    onClick={(event, photos) => {
                        handlePhotoClick(photos.index)
                    }}
                />
            </Container>

            <Link
                href={'https://t.me/nearspace'}
                className={'telegram-message'}
                title={t('telegram')}
                rel={'noindex nofollow'}
                target={'_blank'}
            >
                <Icon name={'Telegram'} /> {t('about-page.telegram-channel')}
            </Link>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>{t('about-page.team-title')}</h2>
                <p style={{ marginTop: 0 }}>
                    {t('about-page.team-description')}
                </p>
                <Team />
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('about-page.project-title')}
                </h2>
                <p style={{ marginTop: 0 }}>
                    {t('about-page.project-description')}
                </p>
                <p>
                    {t('about-page.project-goal')}
                    <Link
                        href={'/stargazing'}
                        style={{ marginLeft: '5px' }}
                        title={t('stargazing')}
                    >
                        {t('stargazing')}
                    </Link>
                    {t('about-page.project-sidewalk')}
                    <Link
                        href={'/stargazing/where'}
                        style={{ marginLeft: '5px' }}
                        title={t('about-page.project-sidewalk-link')}
                    >
                        {t('about-page.project-sidewalk-link')}
                    </Link>
                    {'.'}
                </p>
                <p>{t('about-page.project-locations')}</p>
                <Gallery
                    photos={galleryStargazing}
                    columns={4}
                    direction={'row'}
                    targetRowHeight={200}
                    onClick={(event, photos) => {
                        handlePhotoClick(
                            galleryObservatory.length + photos.index
                        )
                    }}
                />
                <p>{t('about-page.project-lectures')}</p>
                <p style={{ marginBottom: 0 }}>
                    {t('about-page.project-sidewalk-astronomy')}
                </p>
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('about-page.observatory-title')}
                </h2>
                <p style={{ marginTop: 0 }}>
                    {t('about-page.observatory-intro')}
                </p>
                <Gallery
                    photos={galleryObservatory}
                    columns={4}
                    direction={'row'}
                    targetRowHeight={200}
                    onClick={(event, photos) => {
                        handlePhotoClick(photos.index)
                    }}
                />
                <p>
                    {t('about-page.observatory-work-1')}
                    <Link
                        href={'/objects'}
                        style={{ marginLeft: '5px' }}
                        title={t('objects')}
                    >
                        {t('objects')}
                    </Link>
                    {t('about-page.observatory-work-2')}
                </p>
                <p>
                    {t('about-page.observatory-photos-1')}
                    <Link
                        href={'/photos'}
                        style={{ marginLeft: '5px' }}
                        title={t('astrophoto')}
                    >
                        {t('astrophoto')}
                    </Link>
                    {t('about-page.observatory-photos-2')}
                </p>
                <p style={{ marginBottom: 0 }}>
                    {t('about-page.observatory-conclusion')}
                </p>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('about-page.your-help-title')}
                </h2>
                <p style={{ marginTop: 0 }}>
                    {t('about-page.your-help-intro')}
                </p>
                <p>{t('about-page.your-help-description')}</p>
                <h3>{t('about-page.your-help-financial-support')}</h3>
                <ul>
                    {contributors1.map((name) => (
                        <li key={name}>{name}</li>
                    ))}
                </ul>
                <h3>{t('about-page.your-help-technical-support')}</h3>
                <ul>
                    {contributors2.map((name) => (
                        <li key={name}>{name}</li>
                    ))}
                </ul>
                <p style={{ margin: 0 }}>
                    {t('about-page.your-help-conclusion')}
                </p>
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
        async (context): Promise<GetServerSidePropsResult<AboutPageProps>> => {
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

export default AboutPage
