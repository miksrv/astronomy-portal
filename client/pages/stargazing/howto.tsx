import React, { useState } from 'react'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar, PhotoGallery, PhotoLightbox } from '@/components/common'
import photoStargazing1 from '@/public/photos/stargazing-4.jpeg'
import photoStargazing2 from '@/public/photos/stargazing-5.jpeg'
import photoStargazing3 from '@/public/photos/stargazing-9.jpeg'
import photoStargazing4 from '@/public/photos/stargazing-10.jpeg'

const photosGallery = [photoStargazing1, photoStargazing2, photoStargazing3, photoStargazing4]

const StargazingHowToPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const title = t('pages.stargazing-howto.title', { defaultValue: 'Как проходят астровыезды' })

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
            canonical={'stargazing/howto'}
            title={title}
            description={t('pages.stargazing-howto.description', {
                defaultValue:
                    'Узнайте, как проходят астровыезды в Оренбурге: регистрация, лекции о космосе, наблюдения в телескопы и обучение ориентации по звездному небу. Подписывайтесь на Telegram-канал «Смотри на звезды» и присоединяйтесь к уникальным астрономическим мероприятиям под звездным небом!'
            })}
            openGraph={{
                images: [
                    {
                        height: 1467,
                        url: '/photos/stargazing-9.jpeg',
                        width: 2200
                    }
                ]
            }}
        >
            <AppToolbar
                title={title}
                currentPage={title}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', { defaultValue: 'Астровыезды' })
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ margin: 0 }}>
                    {t('pages.stargazing-howto.unique_event', {
                        defaultValue:
                            'Каждый астровыезд уникален, но мы придерживаемся общего сценария, чтобы сделать мероприятие интересным и удобным для всех участников.'
                    })}
                </p>
                <h3 style={{ marginTop: 10 }}>
                    {t('pages.stargazing-howto.event_announcement', { defaultValue: 'Анонс мероприятия' })}
                </h3>
                <p style={{ margin: 0 }}>
                    {t('pages.stargazing-howto.event_announcement_text', {
                        defaultValue:
                            'Астровыезды в Оренбурге проводятся при благоприятной погоде, поэтому точная дата становится известна лишь за 2-3 дня до события. Мы заранее объявляем о готовящихся выездах в нашем Telegram-канале «Смотри на звезды», где публикуем анонсы и важные обновления. Подписка на канал обязательна, чтобы не пропустить новый астровыезд.'
                    })}
                </p>
                <h3 style={{ marginTop: 10 }}>
                    {t('pages.stargazing-howto.registration', { defaultValue: 'Регистрация на астровыезд' })}
                </h3>
                <p style={{ margin: 0 }}>
                    {t('pages.stargazing-howto.registration_text', {
                        defaultValue:
                            'Для участия требуется предварительная регистрация через наш сайт. Это бесплатно, процесс занимает всего одну минуту. Обратите внимание: остерегайтесь мошенников, если кто-то просит оплату за участие — это обман! Мы приветствуем донаты, но участие всегда остается бесплатным.'
                    })}
                </p>
                <h3 style={{ marginTop: 10 }}>
                    {t('pages.stargazing-howto.location', { defaultValue: 'Место проведения' })}
                </h3>
                <p style={{ marginTop: 0 }}>
                    {t('pages.stargazing-howto.location_text', {
                        defaultValue:
                            'Астровыезды проводятся за городом, вдали от городской засветки, обычно в 40 км от Оренбурга. Точное место проведения откроется после регистрации. Добираться до поляны нужно самостоятельно, поэтому заранее уточняйте маршрут. Последний участок пути — грунтовая дорога длиной около 300 метров.'
                    })}
                </p>
                <PhotoGallery
                    photos={photosGallery}
                    onClick={({ index }) => {
                        handlePhotoClick(index)
                    }}
                />
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('pages.stargazing-howto.event_plan', { defaultValue: 'План проведения астровыезда' })}
                </h2>
                <ul style={{ listStyle: 'decimal', marginBottom: 0 }}>
                    <li style={{ marginBottom: '10px' }}>
                        <h3>{t('pages.stargazing-howto.arrival', { defaultValue: 'Прибытие на место' })}</h3>
                        <p style={{ margin: 0 }}>
                            {t('pages.stargazing-howto.arrival_text', {
                                defaultValue:
                                    'Приезжайте за 15–20 минут до начала, чтобы занять удобное место на астрономической поляне. Возьмите с собой походные стулья или коврики для комфортного размещения.'
                            })}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3>{t('pages.stargazing-howto.lecture', { defaultValue: 'Астролекция' })}</h3>
                        <p style={{ margin: 0 }}>
                            {t('pages.stargazing-howto.lecture_text', {
                                defaultValue:
                                    'Как только наступают сумерки, начинается наша астролекция. На большом экране мы показываем видео и фото, рассказывая о космосе доступным и интересным языком. Темы лекций варьируются: от «Метеоритный поток Персеиды» до «Что скрывают Черные дыры». Лекции рассчитаны на участников от 8 лет и длятся около часа.'
                            })}
                        </p>
                    </li>
                    <li style={{ marginBottom: '10px' }}>
                        <h3>
                            {t('pages.stargazing-howto.orientation', { defaultValue: 'Ориентация по звездному небу' })}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {t('pages.stargazing-howto.orientation_text', {
                                defaultValue:
                                    'После лекции мы учим вас находить основные звезды и созвездия, показывая их на небе. Эта часть длится около 20 минут.'
                            })}
                        </p>
                    </li>
                    <li>
                        <h3>
                            {t('pages.stargazing-howto.telescope_observation', {
                                defaultValue: 'Наблюдение в телескопы'
                            })}
                        </h3>
                        <p style={{ margin: 0 }}>
                            {t('pages.stargazing-howto.telescope_observation_text', {
                                defaultValue:
                                    'На астрономической площадке установлено несколько телескопов, каждый из которых настроен на определенные космические объекты. Вы сможете смотреть в телескопы, задавать вопросы и общаться с астрономами.'
                            })}
                        </p>
                    </li>
                </ul>
            </Container>
            <Container style={{ marginBottom: '10px' }}>
                <h3 style={{ marginTop: 10 }}>
                    {t('pages.stargazing-howto.event_duration', { defaultValue: 'Продолжительность мероприятия' })}
                </h3>
                <p style={{ margin: 0 }}>
                    {t('pages.stargazing-howto.event_duration_text', {
                        defaultValue:
                            'Весь астровыезд занимает от 2 до 4 часов. Вы можете покинуть площадку в любое время, но многие остаются до последнего, наслаждаясь видами звездного неба.'
                    })}
                </p>
                <h3 style={{ marginTop: 10 }}>
                    {t('pages.stargazing-howto.recommendations', { defaultValue: 'Обязательные рекомендации' })}
                </h3>
                <p style={{ margin: 0 }}>
                    {t('pages.stargazing-howto.recommendations_text', {
                        defaultValue:
                            'Пожалуйста, ознакомьтесь с разделом «Правила поведения на астровыездах», чтобы мероприятие прошло комфортно и безопасно для всех.'
                    })}
                </p>
                <h3 style={{ marginTop: 10 }}>
                    {t('pages.stargazing-howto.thematic_evenings', { defaultValue: 'Тематические вечера' })}
                </h3>
                <p style={{ marginTop: 0 }}>
                    {t('pages.stargazing-howto.thematic_evenings_text', {
                        defaultValue:
                            'Иногда мы проводим тротуарную астрономию прямо в городе. Подробности о таких мероприятиях читайте в разделе «Где посмотреть в телескоп в Оренбурге».'
                    })}
                </p>
                <p style={{ margin: 0 }}>
                    {t('pages.stargazing-howto.faq', {
                        defaultValue: 'Не нашли ответа на свой вопрос? Загляните в раздел'
                    })}
                    <Link
                        href={'/stargazing/faq'}
                        title={t('menu.stargazing-faq', { defaultValue: 'Часто задаваемые вопросы' })}
                        style={{ margin: '0 5px' }}
                    >
                        {t('menu.stargazing-faq')}
                    </Link>
                    {t('pages.stargazing-howto.telegram', { defaultValue: 'или пишите в нашем Telegram-канале' })}
                    <Link
                        href={'https://t.me/look_at_stars'}
                        style={{ marginLeft: '5px' }}
                        title={t('common.telegram', { defaultValue: 'Телеграм' })}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('common.look-at-the-stars', { defaultValue: 'Смотри на звёзды' })}
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
        async (context): Promise<GetServerSidePropsResult<object>> => {
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
