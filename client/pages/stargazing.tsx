import React, { useState } from 'react'
import { getCookie } from 'cookies-next'
import { Button, Container, Icon } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, setLocale, useAppSelector, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar, PhotoGallery, PhotoLightbox } from '@/components/common'
import { EventsList, EventUpcoming } from '@/components/pages/stargazing'
import { createFullPhotoUrl, createPreviewPhotoUrl } from '@/utils/eventPhotos'

interface StargazingPageProps {
    upcomingData: ApiModel.Event | null
    events: ApiModel.Event[]
    photos: ApiModel.EventPhoto[]
}

const StargazingPage: NextPage<StargazingPageProps> = ({ upcomingData, events, photos }) => {
    const { t } = useTranslation()
    const router = useRouter()

    const userRole = useAppSelector((state) => state.auth?.user?.role)

    const title = t('pages.stargazing.title', 'Астровыезды')
    const rulesLink = t('pages.stargazing.rules_link', 'Правила поведения на астровыездах')
    const howtoLink = t('pages.stargazing.howto_link', 'Как проходят астровыезды')
    const whereLink = t('pages.stargazing.where_link', 'Где посмотреть в телескоп в Оренбурге')
    const faqLink = t('pages.stargazing.faq_link', 'Часто задаваемые вопросы')

    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>(0)

    const handlePhotoClick = (index: number) => {
        setPhotoIndex(index)
        setShowLightbox(true)
    }

    const handleHideLightbox = () => {
        setShowLightbox(false)
    }

    const handleCreate = async () => {
        await router.push('/stargazing/form')
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
                        size={'large'}
                        label={t('pages.stargazing.create-stargazing_button', 'Добавить астровыезд')}
                        onClick={handleCreate}
                    />
                )}
            </AppToolbar>

            <EventUpcoming
                style={{ marginBottom: 10 }}
                event={upcomingData || undefined}
            />

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

            <Container>
                <p style={{ marginTop: 0 }}>
                    {t(
                        'pages.stargazing.text-part-1',
                        'Астровыезд в Оренбурге - это возможность прикоснуться к тайнам Вселенной, наблюдая звёздное небо в полной темноте. Мы приглашаем вас в увлекательные поездки за город, где телескопы открывают космические горизонты прямо в полях Оренбуржья.'
                    )}
                </p>
                <p>
                    {t(
                        'pages.stargazing.text-part-2',
                        'Каждый астровыезд - это вечер научных открытий, вдохновляющих лекций и живого общения с единомышленниками. Вы узнаете, как проходят наши мероприятия, познакомитесь с основными правилами поведения на астровыездах и сможете заранее подготовиться к наблюдению за звёздами.'
                    )}
                </p>

                <ul style={{ marginBottom: '20px' }}>
                    <li>
                        <Link
                            href={'/stargazing/rules'}
                            title={rulesLink}
                        >
                            {rulesLink}
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={'/stargazing/howto'}
                            title={howtoLink}
                        >
                            {howtoLink}
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={'/stargazing/where'}
                            title={whereLink}
                        >
                            {whereLink}
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={'/stargazing/faq'}
                            title={faqLink}
                        >
                            {faqLink}
                        </Link>
                    </li>
                </ul>

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
            </Container>

            <EventsList events={events} />

            <AppFooter />
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
