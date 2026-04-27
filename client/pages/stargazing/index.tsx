import React, { useState } from 'react'
import { getCookie } from 'cookies-next'
import { Button, Container, Icon } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, ApiModel, setLocale, useAppSelector, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar, PhotoGallery, PhotoLightbox } from '@/components/common'
import { EventsList, EventUpcoming, InfoCards, ReviewsWidget } from '@/components/pages/stargazing'
import type { InfoCardItem } from '@/components/pages/stargazing/info-cards'
import { createFullPhotoUrl, createPreviewPhotoUrl } from '@/utils/eventPhotos'

interface StargazingPageProps {
    upcomingData: ApiModel.Event | null
    events: ApiModel.Event[]
    photos: ApiModel.EventPhoto[]
}

const StargazingPage: NextPage<StargazingPageProps> = ({ upcomingData, events, photos }) => {
    const { t } = useTranslation()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const title = t('pages.stargazing.title', 'Астровыезды')

    const infoCards: InfoCardItem[] = [
        {
            href: '/stargazing/rules',
            icon: 'ReportError',
            title: t('pages.stargazing.rules_link', 'Правила поведения на астровыездах'),
            description: t('pages.stargazing.rules_card_desc', 'Что нельзя делать и как уважать других участников')
        },
        {
            href: '/stargazing/howto',
            icon: 'StarFilled',
            title: t('pages.stargazing.howto_link', 'Как проходят астровыезды'),
            description: t('pages.stargazing.howto_card_desc', 'Программа вечера, телескопы и лекции')
        },
        {
            href: '/stargazing/where',
            icon: 'Map',
            title: t('pages.stargazing.where_link', 'Где посмотреть в телескоп в Оренбурге'),
            description: t('pages.stargazing.where_card_desc', 'Место проведения в Оренбургском районе')
        },
        {
            href: '/stargazing/faq',
            icon: 'Compass',
            title: t('pages.stargazing.faq_link', 'Часто задаваемые вопросы'),
            description: t('pages.stargazing.faq_card_desc', 'Ответы на популярные вопросы участников')
        }
    ]

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
        <AppLayout
            canonical={'stargazing'}
            title={title}
            description={t(
                'pages.stargazing.description',
                'Астровыезд в Оренбурге - увлекательные поездки за город, где телескопы открывают космические горизонты. Вечера научных открытий, лекций и живого общения с единомышленниками. Узнайте правила поведения и подготовьтесь к наблюдению за звёздами.'
            )}
            openGraph={{
                images: [
                    {
                        height: 853,
                        url: '/photos/stargazing-1.jpeg',
                        width: 1280
                    }
                ]
            }}
        >
            <AppToolbar
                title={title}
                currentPage={title}
            >
                {userRole === ApiModel.UserRole.ADMIN && (
                    <Button
                        icon={'PlusCircle'}
                        mode={'secondary'}
                        label={t('pages.stargazing.create-stargazing_button', 'Добавить астровыезд')}
                        link={'/stargazing/form'}
                    />
                )}
            </AppToolbar>

            <div>
                {t(
                    'pages.stargazing.text',
                    'Представьте: ночное небо без городских огней, тысячи звёзд над головой и кольца Сатурна в окуляре телескопа. Наши астровыезды за город - это не просто наблюдения, это вечера, которые меняют взгляд на мир. Присоединяйтесь, чтобы увидеть Вселенную своими глазами!'
                )}
            </div>

            <EventUpcoming event={upcomingData || undefined} />

            <Link
                href={'https://t.me/look_at_stars'}
                className={'telegram-message'}
                title={t('pages.stargazing.telegram', 'Телеграм')}
                rel={'noindex nofollow'}
                target={'_blank'}
            >
                <Icon name={'Telegram'} />{' '}
                {t(
                    'pages.stargazing.telegram-subscription',
                    'Чтобы не пропустить анонсы - подпишитесь на Telegram канал'
                )}
            </Link>

            <InfoCards items={infoCards} />

            <Container>
                <PhotoGallery
                    photos={
                        photos?.map((photo, index) => ({
                            height: photo.height,
                            src: createPreviewPhotoUrl(photo),
                            width: photo.width,
                            alt: t('pages.stargazing.photo_alt', 'Фото ({{number}}) с астровыезда - {{name}} ', {
                                number: index + 1,
                                name: photo?.title
                            })
                        })) || []
                    }
                    onClick={({ index }) => {
                        handlePhotoClick(index)
                    }}
                />
            </Container>

            <ReviewsWidget />

            <h2>{t('pages.stargazing.events-archive', 'Архив астровыездов')}</h2>

            <EventsList events={events} />

            <AppFooter />

            <PhotoLightbox
                photos={
                    photos?.map((photo, index) => ({
                        height: photo.height,
                        src: createFullPhotoUrl(photo),
                        width: photo.width,
                        title: t('pages.stargazing.photo_title', 'Астровыезд: {{name}} - Фото ({{number}})', {
                            number: index + 1,
                            name: photo?.title
                        })
                    })) || []
                }
                photoIndex={photoIndex}
                showLightbox={showLightbox}
                onCloseLightBox={handleHideLightbox}
                onChangeIndex={setPhotoIndex}
            />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<StargazingPageProps>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

            if (token) {
                store.dispatch(setSSRToken(token))
            }

            const { data: eventsData } = await store.dispatch(API.endpoints?.eventGetList.initiate())
            const { data: upcomingData } = await store.dispatch(API.endpoints?.eventGetUpcoming.initiate())

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
                    upcomingData: upcomingData || null,
                    events: eventsData?.items || [],
                    photos: photosData?.items || []
                }
            }
        }
)

export default StargazingPage
