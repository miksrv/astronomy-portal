import React, { useState } from 'react'
import { Container } from 'simple-react-ui-kit'

import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { SITE_LINK, wrapper } from '@/api'
import { PhotoGallery, PhotoLightbox, StaticInfoPageLayout } from '@/components/common'
import photoStargazing1 from '@/public/photos/stargazing-4.jpeg'
import photoStargazing2 from '@/public/photos/stargazing-5.jpeg'
import photoStargazing3 from '@/public/photos/stargazing-9.jpeg'
import photoStargazing4 from '@/public/photos/stargazing-10.jpeg'
import { initSSRLocale } from '@/utils/ssrLocale'

const photosGallery = [photoStargazing1, photoStargazing2, photoStargazing3, photoStargazing4]

// Single source of truth for the 4-step plan, shared by the HowTo JSON-LD schema
// and the visible "event_plan" list below — editing a step only means editing it here.
const PLAN_STEPS = [
    {
        key: 'arrival',
        titleFallback: 'Прибытие на место',
        textKey: 'arrival_text',
        textFallback:
            'Приезжайте за час-полтора до начала, чтобы спокойно найти удобное место на астрономической поляне и расположиться. Как правило, мы начинаем программу, когда солнце садится за горизонт, так что у вас будет время встретить закат. Возьмите с собой походные стулья или коврики для комфортного размещения.'
    },
    {
        key: 'lecture',
        titleFallback: 'Астролекция',
        textKey: 'lecture_text',
        textFallback:
            'Как только наступают сумерки, начинается наша астролекция. На большом экране мы показываем видео и фото, рассказывая о космосе доступным и интересным языком. Темы лекций варьируются: от «Метеоритный поток Персеиды» до «Что скрывают Черные дыры». Лекции рассчитаны на участников от 8 лет и длятся около часа.'
    },
    {
        key: 'orientation',
        titleFallback: 'Экскурсия по звёздному небу',
        textKey: 'orientation_text',
        textFallback:
            'После лекции мы выключаем экран и гасим весь свет на площадке – наступает настоящая темнота, и над головой открывается всё звёздное небо. С помощью лазерных указок ведущие показывают созвездия и самые яркие звёзды, рассказывают, что где находится и как ориентироваться по небу без приборов – только по памяти и приметным звёздам. Эта часть длится около 20 минут.'
    },
    {
        key: 'telescope_observation',
        titleFallback: 'Наблюдение в телескопы',
        textKey: 'telescope_observation_text',
        textFallback:
            'На астрономической площадке установлено несколько телескопов, каждый из которых настроен на определенные космические объекты. Вы сможете смотреть в телескопы, задавать вопросы и общаться с астрономами.'
    }
] as const

const StargazingHowToPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const { t: tPage } = useTranslation('stargazing-howto')

    const title = tPage('title', 'Как проходят астровыезды')

    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>(0)

    const handlePhotoClick = (index: number) => {
        setPhotoIndex(index)
        setShowLightbox(true)
    }

    const handleHideLightbox = () => {
        setShowLightbox(false)
    }

    const planSteps = PLAN_STEPS.map((step) => ({
        name: tPage(step.key, step.titleFallback),
        text: tPage(step.textKey, step.textFallback)
    }))

    const howToSchema = {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: tPage('title', 'Как проходят астровыезды'),
        description: tPage(
            'description',
            'Узнайте, как проходят астровыезды в Оренбурге: регистрация, лекции о космосе, наблюдения в телескопы и обучение ориентации по звёздному небу.'
        ),
        url: `${SITE_LINK}stargazing/howto`,
        step: planSteps.map((step, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: step.name,
            text: step.text
        }))
    }

    return (
        <StaticInfoPageLayout
            canonical={'stargazing/howto'}
            title={title}
            description={tPage(
                'description',
                'Узнайте, как проходят астровыезды в Оренбурге: регистрация, лекции о космосе, наблюдения в телескопы и обучение ориентации по звёздному небу. Подписывайтесь на Telegram-канал «Смотри на звёзды» и присоединяйтесь к уникальным астрономическим мероприятиям под звёздным небом!'
            )}
            openGraph={{
                images: [
                    {
                        height: 1467,
                        url: '/photos/stargazing-9.jpeg',
                        width: 2200
                    }
                ]
            }}
            jsonLd={{ scriptKey: 'howto-schema', data: howToSchema }}
            breadcrumbLinks={[
                {
                    link: '/stargazing',
                    text: t('menu.stargazing', 'Астровыезды')
                }
            ]}
        >
            <div>
                {tPage(
                    'unique_event',
                    'Каждый астровыезд уникален, но мы придерживаемся общего сценария, чтобы сделать мероприятие интересным и удобным для всех участников.'
                )}
            </div>

            <Container>
                <h3>{tPage('event_announcement', 'Анонс мероприятия')}</h3>
                <p style={{ margin: 0 }}>
                    {tPage(
                        'event_announcement_text',
                        'Астровыезды в Оренбурге проводятся при благоприятной погоде, поэтому точная дата становится известна лишь за 2-3 дня до события. Мы заранее объявляем о готовящихся выездах в нашем Telegram-канале «Смотри на звёзды», где публикуем анонсы и важные обновления. Подписка на канал обязательна, чтобы не пропустить новый астровыезд.'
                    )}
                </p>
                <h3 style={{ marginTop: 10 }}>{tPage('registration', 'Регистрация на астровыезд')}</h3>
                <p style={{ margin: 0 }}>
                    {tPage(
                        'registration_text',
                        'Для участия требуется предварительная регистрация через наш сайт - сама заявка всегда бесплатна и занимает одну минуту. Некоторые выезды платные: взрослый билет оплачивается сразу на сайте банковской картой, дети до 18 лет - всегда бесплатно, после оплаты вы получите QR-билет. Официальная оплата проходит только через сайт - мы никогда не просим перевести деньги на карту, в личных сообщениях или через третьих лиц. Если кто-то просит оплатить участие так - это мошенники, не переводите деньги и сообщите нам.'
                    )}
                </p>
                <h3 style={{ marginTop: 10 }}>{tPage('location', 'Место проведения')}</h3>
                <p style={{ marginTop: 0 }}>
                    {tPage(
                        'location_text',
                        'Астровыезды проводятся за городом, вдали от городской засветки, обычно в 40 км от Оренбурга. Точное место проведения откроется после регистрации. Добираться до поляны нужно самостоятельно, поэтому заранее уточняйте маршрут. Последний участок пути - грунтовая дорога длиной около 300 метров.'
                    )}
                </p>
                <PhotoGallery
                    photos={photosGallery}
                    onClick={({ index }) => {
                        handlePhotoClick(index)
                    }}
                />
            </Container>

            <h2>{tPage('event_plan', 'План проведения астровыезда')}</h2>

            <Container>
                <ul style={{ listStyle: 'decimal', margin: 0, padding: '0 20px' }}>
                    {planSteps.map((step, index) => (
                        <li
                            key={step.name}
                            style={index < planSteps.length - 1 ? { marginBottom: '10px' } : undefined}
                        >
                            <h3>{step.name}</h3>
                            <p style={{ margin: 0 }}>{step.text}</p>
                        </li>
                    ))}
                </ul>
            </Container>

            <Container>
                <h3>{tPage('event_duration', 'Продолжительность мероприятия')}</h3>
                <p style={{ margin: 0 }}>
                    {tPage(
                        'event_duration_text',
                        'Весь астровыезд занимает от 2 до 4 часов. Вы можете покинуть площадку в любое время, но многие остаются до последнего, наслаждаясь видами звёздного неба.'
                    )}
                </p>
                <h3 style={{ marginTop: 10 }}>{tPage('recommendations', 'Обязательные рекомендации')}</h3>
                <p style={{ margin: 0 }}>
                    {tPage(
                        'recommendations_text',
                        'Пожалуйста, ознакомьтесь с разделом «Правила поведения на астровыездах», чтобы мероприятие прошло комфортно и безопасно для всех.'
                    )}
                </p>
                <h3 style={{ marginTop: 10 }}>{tPage('thematic_evenings', 'Тематические вечера')}</h3>
                <p style={{ marginTop: 0 }}>
                    {tPage(
                        'thematic_evenings_text',
                        'Иногда мы проводим тротуарную астрономию прямо в городе. Подробности о таких мероприятиях читайте в разделе «Где посмотреть в телескоп в Оренбурге».'
                    )}
                </p>
                <p style={{ margin: 0 }}>
                    {tPage('faq', 'Не нашли ответа на свой вопрос? Загляните в раздел')}
                    <Link
                        href={'/stargazing/faq'}
                        title={t('menu.stargazing-faq', 'Часто задаваемые вопросы')}
                        style={{ margin: '0 5px' }}
                    >
                        {t('menu.stargazing-faq', 'Часто задаваемые вопросы')}
                    </Link>
                    {tPage('telegram', 'или пишите в нашем Telegram-канале')}
                    <Link
                        href={'https://t.me/look_at_stars'}
                        style={{ marginLeft: '5px' }}
                        title={t('common.telegram', 'Телеграм')}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('common.look-at-the-stars', 'Смотри на звёзды')}
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
        </StaticInfoPageLayout>
    )
}

export const getStaticProps = wrapper.getStaticProps(
    (store) =>
        async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<object>> => {
            const { translations } = await initSSRLocale(store, context, ['translation', 'stargazing-howto'])

            return {
                props: {
                    ...translations
                },
                revalidate: 86400
            }
        }
)

export default StargazingHowToPage
