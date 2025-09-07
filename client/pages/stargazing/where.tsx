import React, { useState } from 'react'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar, PhotoGallery, PhotoLightbox } from '@/components/common'
import photoSidewalk1 from '@/public/photos/sidewalk-asrtronomy-1.jpeg'
import photoSidewalk2 from '@/public/photos/sidewalk-asrtronomy-2.jpeg'
import photoSidewalk3 from '@/public/photos/sidewalk-asrtronomy-3.jpeg'
import photoSidewalk4 from '@/public/photos/sidewalk-asrtronomy-4.jpeg'

const gallerySidewalk = [photoSidewalk1, photoSidewalk2, photoSidewalk3, photoSidewalk4]

const StargazingWherePage: NextPage<object> = () => {
    const { t } = useTranslation()

    const title = t('pages.stargazing-where.title', 'Где посмотреть в телескоп в Оренбурге')

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
            canonical={'stargazing/where'}
            title={title}
            description={t('pages.stargazing-where.description', {
                defaultValue:
                    'Узнайте, где в Оренбурге можно посмотреть в телескоп. Тротуарная астрономия: бесплатные наблюдения Луны, планет и звезд на улицах города. Хотите увидеть больше — отправляйтесь на выезд за город для наблюдения туманностей и галактик!'
            })}
            openGraph={{
                images: [
                    {
                        height: 960,
                        url: '/photos/sidewalk-asrtronomy-1.jpeg',
                        width: 1280
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
                        text: t('menu.stargazing', 'Астровыезды')
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ marginTop: 0 }}>
                    {t(
                        'pages.stargazing-where.intro',
                        'Тротуарная астрономия — это уникальный формат, благодаря которому космос становится ближе. Весной, летом и осенью мы выставляем телескопы прямо на тротуарах и площадях Оренбурга, чтобы любой желающий мог подойти и бесплатно взглянуть на звезды, планеты и Луну. Это отличная возможность для жителей города познакомиться с астрономией в непринужденной и дружественной атмосфере.'
                    )}
                </p>
                <p>
                    {t(
                        'pages.stargazing-where.announcement-1',
                        'Анонсы вечеров тротуарной астрономии мы почти всегда публикуем в нашем'
                    )}
                    <Link
                        style={{ margin: '0 5px' }}
                        href={'https://t.me/look_at_stars'}
                        title={t('common.telegram', 'Телеграм')}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('pages.stargazing-where.telegram-channel', 'телеграм-канале')}
                    </Link>
                    {t(
                        'pages.stargazing-where.announcement-2',
                        ', но иногда наши телескопы можно встретить на улицах города и без предупреждения. Один из вдохновителей проекта, астролектор Владимир Иванович, нередко делится своими знаниями, показывая всем желающим интересные астрономические объекты. Просто ищите телескоп — и вы точно попадете на незабываемую экскурсию по звездному небу!'
                    )}
                </p>
                <PhotoGallery
                    photos={gallerySidewalk}
                    onClick={({ index }) => {
                        handlePhotoClick(index)
                    }}
                />
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('pages.stargazing-where.what-you-can-see-title', 'Что можно увидеть в телескоп из города?')}
                </h2>
                <p>
                    {t(
                        'pages.stargazing-where.what-you-can-see-description',
                        'В условиях городского светового загрязнения наиболее яркие объекты остаются видимыми. Например, вы сможете рассмотреть:'
                    )}
                </p>
                <ul>
                    <li>
                        {t(
                            'pages.stargazing-where.what-you-can-see-1',
                            'Кратеры и горы на Луне, особенно впечатляющие в фазах первой и последней четверти;'
                        )}
                    </li>
                    <li>
                        {t(
                            'pages.stargazing-where.what-you-can-see-2',
                            'Кольца Сатурна, которые неизменно вызывают восторг;'
                        )}
                    </li>
                    <li>
                        {t(
                            'pages.stargazing-where.what-you-can-see-3',
                            'Яркие звезды и двойные звезды, такие как Альбирео;'
                        )}
                    </li>
                    <li>
                        {t(
                            'pages.stargazing-where.what-you-can-see-4',
                            'Парады планет, если они происходят в подходящее время года.'
                        )}
                    </li>
                </ul>
                <p style={{ marginBottom: 0 }}>
                    {t(
                        'pages.stargazing-where.what-you-can-see-conclusion',
                        'Однако городское освещение ограничивает наши возможности. Туманности, галактики, метеорные потоки и даже крупные звездные скопления часто остаются скрытыми от взгляда.'
                    )}
                </p>
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('pages.stargazing-where.want-to-see-more', 'Хотите увидеть больше? Выезжайте за город!')}
                </h2>
                <p>
                    {t(
                        'pages.stargazing-where.want-to-see-description-1',
                        'Для наблюдения слабосветящихся объектов, таких как туманности Ориона, Андромеды, метеорные потоки и звездные скопления, необходимо отправиться подальше от городских огней. В таких местах, как Оренбургская степь или другие удаленные районы, ночное небо поражает своей красотой.'
                    )}
                </p>
                <p>
                    {t(
                        'pages.stargazing-where.want-to-see-description-2',
                        'Мы регулярно организуем выездные астрономические мероприятия, где можно насладиться полной палитрой космических объектов. Следите за анонсами на нашей странице «Астровыезды» или в Telegram-канале, чтобы присоединиться к одному из таких наблюдений.'
                    )}
                </p>
                <p style={{ marginBottom: 0 }}>
                    {t('pages.stargazing-where.want-to-see-description-3', 'Пусть звезды станут ближе!')}
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

export default StargazingWherePage
