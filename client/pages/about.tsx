import React, { useState } from 'react'
import { Container, Icon } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar, PhotoGallery, PhotoLightbox } from '@/components/common'
import { ProjectTeam } from '@/components/pages/about'
import donators from '@/public/data/list_donators.json'
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

const galleryAboutMe = [photoAboutMe1, photoAboutMe2, photoAboutMe3, photoAboutMe4]

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

const allPhotos = [...galleryAboutMe, ...galleryStargazing, ...galleryObservatory]

type DonaterType = {
    name: string
    tooltip?: string
}

type AboutPageProps = object

const AboutPage: NextPage<AboutPageProps> = () => {
    const { t } = useTranslation()

    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>(0)

    const title = t('pages.about.title', 'О проекте')

    const handlePhotoClick = (index: number) => {
        setPhotoIndex(index)
        setShowLightbox(true)
    }

    const handleHideLightbox = () => {
        setShowLightbox(false)
    }

    return (
        <AppLayout
            canonical={'about'}
            title={title}
            description={t(
                'pages.about.description',
                'Узнайте больше о проекте «Смотри на звезды», нашей команде и самодельной астрономической обсерватории. Присоединяйтесь к нам и откройте для себя красоту космоса!'
            )}
            openGraph={{
                images: [
                    {
                        height: 853,
                        url: '/photos/stargazing-2.jpeg',
                        width: 1280
                    }
                ]
            }}
        >
            <AppToolbar
                title={title}
                currentPage={title}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ marginTop: 0 }}>
                    {t('pages.about.my-name', 'Меня зовут')}
                    <Link
                        href={'https://miksoft.pro'}
                        style={{ marginLeft: '5px' }}
                        title={t('pages.about.misha', 'Миша')}
                        target={'_blank'}
                    >
                        {t('pages.about.misha', 'Миша')}
                    </Link>
                    {t(
                        'pages.about.intro',
                        ', и этот сайт — моя попытка рассказать вам о своём хобби, собрать воедино всю информацию и запечатлеть достижения, сделанные на пути к изучению космоса. Астрономия для меня — это не просто увлечение, а целый мир, который изменил мою жизнь. Благодаря ей я нашел невероятных друзей, узнал много нового и осознал, насколько велики и загадочны просторы Вселенной. Этот проект — наш совместный вклад в популяризацию и развитие астрономии. Мы искренне верим, что благодаря нашим усилиям космос станет ближе и доступнее каждому.'
                    )}
                </p>

                <PhotoGallery
                    photos={galleryAboutMe}
                    onClick={({ index }) => {
                        handlePhotoClick(index)
                    }}
                />
            </Container>

            <Link
                href={'https://t.me/look_at_stars'}
                className={'telegram-message'}
                title={t('common.telegram', 'Телеграм')}
                rel={'noindex nofollow'}
                target={'_blank'}
            >
                <Icon name={'Telegram'} />{' '}
                {t('pages.about.telegram-channel', 'Подпишитесь на авторский Telegram канал этого проекта')}
            </Link>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>{t('pages.about.team-title', 'Наша команда')}</h2>
                <p style={{ marginTop: 0 }}>
                    {t(
                        'pages.about.team-description',
                        'Мы работаем в самых разных сферах, но всех нас объединяет одно — любовь к звёздам и ночному небу. С 2016 года мы популяризируем астрономию, организовываем астровыезды в Оренбургской области и вечера тротуарной астрономии в Оренбурге. Вместе мы смотрим на звёзды, делимся знаниями и вдохновляем других.'
                    )}
                </p>
                <ProjectTeam />
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('pages.about.project-title', 'Астрономический проект «Смотри на звёзды»')}
                </h2>
                <p style={{ marginTop: 0 }}>
                    {t(
                        'pages.about.project-description',
                        'В 2016 году в Оренбургской области мы запустили проект «Смотри на звёзды», чтобы сделать астрономию доступной для всех. С тех пор каждый сезон мы устраиваем бесплатные лекции под открытым небом, организуем поездки за город с телескопами и проводим неформальные вечера тротуарной астрономии.'
                    )}
                </p>
                <p>
                    {t(
                        'pages.about.project-goal',
                        'Главная цель проекта — показать величие и красоту Вселенной, вдохновить людей на изучение космоса. Мы охватываем не только Оренбургскую область, но и соседние регионы, выезжая в места, где ночное небо особенно яркое. Узнать больше о наших текущих и прошедших мероприятиях можно на странице'
                    )}
                    <Link
                        href={'/stargazing'}
                        style={{ marginLeft: '5px' }}
                        title={t('menu.stargazing', 'Астровыезды')}
                    >
                        {t('menu.stargazing', 'Астровыезды')}
                    </Link>
                    {t(
                        'pages.about.project-sidewalk',
                        ', а для тех, кто хочет увидеть звёзды в черте города, мы подготовили раздел'
                    )}
                    <Link
                        href={'/stargazing/where'}
                        style={{ marginLeft: '5px' }}
                        title={t('pages.about.project-sidewalk-link', 'Где в Оренбурге посмотреть в телескоп')}
                    >
                        {t('pages.about.project-sidewalk-link', 'Где в Оренбурге посмотреть в телескоп')}
                    </Link>
                    {'.'}
                </p>
                <p>
                    {t(
                        'pages.about.project-locations',
                        'Наши мероприятия проходят не только в городах и поселках Оренбургской области, но и в соседних регионах. Мы организуем выездные экскурсии в удаленные места, где минимальное световое загрязнение позволяет наслаждаться звёздным небом в полной мере. Наша команда астрономов-любителей и волонтёров делится своими знаниями и опытом, чтобы каждый мог открыть для себя красоту и тайны Вселенной.'
                    )}
                </p>
                <PhotoGallery
                    photos={galleryStargazing}
                    onClick={({ index }) => {
                        handlePhotoClick(index)
                    }}
                />
                <p>
                    {t(
                        'pages.about.project-lectures',
                        'Одной из важнейших составляющих проекта являются лекции, которые проводят опытные астрономы-любители. Мы рассказываем о научных открытиях, истории астрономии и её современных достижениях. Лекции проходят в лёгком формате, где сложные вещи объясняются простым и понятным языком. Это помогает слушателям не только расширить кругозор, но и вдохновляет на самостоятельное изучение астрономии.'
                    )}
                </p>
                <p style={{ marginBottom: 0 }}>
                    {t(
                        'pages.about.project-sidewalk-astronomy',
                        'Особое внимание мы уделяем вечерам тротуарной астрономии. Эти встречи под открытым небом проходят в самых доступных местах города. На таких мероприятиях любой желающий может подойти, посмотреть в телескоп и узнать больше о том, что скрывает звёздное небо.'
                    )}
                </p>
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('pages.about.observatory-title', 'Самодельная астрономическая обсерватория')}
                </h2>
                <p style={{ marginTop: 0 }}>
                    {t(
                        'pages.about.observatory-intro',
                        'Этот проект — один из самых значимых этапов моей жизни. Наша самодельная астрономическая обсерватория — уникальное явление для Оренбургской области. Она работает автономно и позволяет получать снимки объектов дальнего космоса, делая астрономию доступной для всех. Более подробно о работе и оборудовании обсерватории можно узнать в разделе - '
                    )}
                    <Link
                        href={'/objects'}
                        title={t('pages.about.observatory-intro-link', 'астрономическая обсерватория в Оренбурге')}
                    >
                        {t('pages.about.observatory-intro-link', 'астрономическая обсерватория в Оренбурге')}
                    </Link>
                    {'.'}
                </p>
                <PhotoGallery
                    photos={galleryObservatory}
                    onClick={({ index }) => {
                        handlePhotoClick(index)
                    }}
                />
                <p>
                    {t(
                        'pages.about.observatory-work-1.text',
                        'Обсерватория открыта для всех желающих. Каждый может воспользоваться её возможностями, чтобы получить изображения космических объектов. Более того, на сайте доступен раздел'
                    )}
                    <Link
                        href={'/objects'}
                        style={{ marginLeft: '5px' }}
                        title={t('pages.about.observatory-work-1.objects', 'Объекты')}
                    >
                        {t('pages.about.observatory-work-1.objects', 'Объекты')}
                    </Link>
                    {t(
                        'pages.about.observatory-work-2',
                        ', где вы найдёте архив FITS-файлов. Эти данные можно использовать для обучения, поиска астероидов, создания астрофотографий и других научных или творческих целей.'
                    )}
                </p>
                <p>
                    {t(
                        'pages.about.observatory-photos-1',
                        'Скоро мы запустим бесплатный сервис управления телескопом, чтобы ещё больше людей могли приобщиться к красоте ночного неба. Не забудьте заглянуть в раздел'
                    )}
                    <Link
                        href={'/photos'}
                        style={{ marginLeft: '5px' }}
                        title={t('pages.about.astrophoto', 'Астрофото')}
                    >
                        {t('pages.about.astrophoto', 'Астрофото')}
                    </Link>
                    {t(
                        'pages.about.observatory-photos-2',
                        ', где собраны снимки, полученные с помощью обсерватории и на наших астровыездах. Эти фотографии обработаны мной и моими друзьями и являются отражением нашей страсти к космосу.'
                    )}
                </p>
                <p style={{ marginBottom: 0 }}>
                    {t(
                        'pages.about.observatory-conclusion',
                        'Этот проект — наш вклад в популяризацию астрономии. Мы искренне надеемся, что он вдохновит и вас открыть для себя Вселенную!'
                    )}
                </p>
            </Container>
            <Container
                id={'your-help'}
                style={{ marginBottom: '10px' }}
            >
                <h2 style={{ marginTop: 0 }}>{t('pages.about.your-help-title', 'Ваша помощь')}</h2>
                <p style={{ marginTop: 0 }}>
                    {t(
                        'pages.about.your-help-intro',
                        'Развитие проекта «Смотри на звёзды» во многом стало возможным благодаря поддержке программы социальных инвестиций «Родные города» компании «Газпром нефть» и содействию команды информационного агентства «Оренбург Медиа».'
                    )}
                </p>
                <p>
                    {t(
                        'pages.about.your-help-description',
                        'Наш проект самодельной обсерватории также нашёл отклик у множества неравнодушных участников. У нас масштабные планы по развитию этого направления, и ваша поддержка играет ключевую роль. Мы благодарны каждому, кто помогает советами, консультациями и рекомендациями. Если мы кого-то случайно не упомянули в списке благодарностей, напишите нам — это очень важно.'
                    )}
                </p>
                <ul
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        height: '400px',
                        overflow: 'auto'
                    }}
                >
                    {donators
                        .slice()
                        .sort((a: DonaterType, b: DonaterType) => a.name.localeCompare(b.name))
                        .map((item: DonaterType, i) => (
                            <li
                                key={`donater-${item?.name}-${i}`}
                                style={{ width: '100%' }}
                            >
                                <span>{item.name}</span>
                                {item.tooltip && (
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            color: '#888',
                                            marginLeft: '5px'
                                        }}
                                    >
                                        ({item.tooltip})
                                    </span>
                                )}
                            </li>
                        ))}
                </ul>
                <p style={{ margin: 0 }}>
                    {t(
                        'pages.about.your-help-conclusion',
                        'Благодаря вашей помощи космос действительно становится ближе!'
                    )}
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
