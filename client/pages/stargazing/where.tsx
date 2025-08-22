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
            title={t('pages.stargazing-where.title', { defaultValue: 'Где посмотреть в телескоп в Оренбурге' })}
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
                title={t('pages.stargazing-where.title', { defaultValue: 'Где посмотреть в телескоп в Оренбурге' })}
                currentPage={t('pages.stargazing-where.title', {
                    defaultValue: 'Где посмотреть в телескоп в Оренбурге'
                })}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', { defaultValue: 'Астровыезды' })
                    }
                ]}
            />

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ marginTop: 0 }}>{t('pages.stargazing-where.intro')}</p>
                <p>
                    {t('pages.stargazing-where.announcement-1', {
                        defaultValue: 'Анонсы вечеров тротуарной астрономии мы почти всегда публикуем в нашем'
                    })}
                    <Link
                        style={{ margin: '0 5px' }}
                        href={'https://t.me/look_at_stars'}
                        title={t('telegram', { defaultValue: 'Телеграмм' })}
                        rel={'noindex nofollow'}
                        target={'_blank'}
                    >
                        {t('pages.stargazing-where.telegram-channel', { defaultValue: 'телеграм-канале' })}
                    </Link>
                    {t('pages.stargazing-where.announcement-2', {
                        defaultValue:
                            ', но иногда наши телескопы можно встретить на улицах города и без предупреждения. Один из вдохновителей проекта, астролектор Владимир Иванович, нередко делится своими знаниями, показывая всем желающим интересные астрономические объекты. Просто ищите телескоп — и вы точно попадете на незабываемую экскурсию по звездному небу!'
                    })}
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
                    {t('pages.stargazing-where.what-you-can-see-title', {
                        defaultValue: 'Что можно увидеть в телескоп из города?'
                    })}
                </h2>
                <p>
                    {t('pages.stargazing-where.what-you-can-see-description', {
                        defaultValue:
                            'В условиях городского светового загрязнения наиболее яркие объекты остаются видимыми. Например, вы сможете рассмотреть:'
                    })}
                </p>
                <ul>
                    <li>
                        {t('pages.stargazing-where.what-you-can-see-1', {
                            defaultValue:
                                'Кратеры и горы на Луне, особенно впечатляющие в фазах первой и последней четверти;'
                        })}
                    </li>
                    <li>
                        {t('pages.stargazing-where.what-you-can-see-2', {
                            defaultValue: 'Кольца Сатурна, которые неизменно вызывают восторг;'
                        })}
                    </li>
                    <li>
                        {t('pages.stargazing-where.what-you-can-see-3', {
                            defaultValue: 'Яркие звезды и двойные звезды, такие как Альбирео;'
                        })}
                    </li>
                    <li>
                        {t('pages.stargazing-where.what-you-can-see-4', {
                            defaultValue: 'Парады планет, если они происходят в подходящее время года.'
                        })}
                    </li>
                </ul>
                <p style={{ marginBottom: 0 }}>
                    {t('pages.stargazing-where.what-you-can-see-conclusion', {
                        defaultValue:
                            'Однако городское освещение ограничивает наши возможности. Туманности, галактики, метеорные потоки и даже крупные звездные скопления часто остаются скрытыми от взгляда.'
                    })}
                </p>
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('pages.stargazing-where.want-to-see-more', {
                        defaultValue: 'Хотите увидеть больше? Выезжайте за город!'
                    })}
                </h2>
                <p>
                    {t('pages.stargazing-where.want-to-see-description-1', {
                        defaultValue:
                            'Для наблюдения слабосветящихся объектов, таких как туманности Ориона, Андромеды, метеорные потоки и звездные скопления, необходимо отправиться подальше от городских огней. В таких местах, как Оренбургская степь или другие удаленные районы, ночное небо поражает своей красотой.'
                    })}
                </p>
                <p>
                    {t('pages.stargazing-where.want-to-see-description-2', {
                        defaultValue:
                            'Мы регулярно организуем выездные астрономические мероприятия, где можно насладиться полной палитрой космических объектов. Следите за анонсами на нашей странице «Астровыезды» или в Telegram-канале, чтобы присоединиться к одному из таких наблюдений.'
                    })}
                </p>
                <p style={{ marginBottom: 0 }}>
                    {t('pages.stargazing-where.want-to-see-description-3', {
                        defaultValue: 'Пусть звезды станут ближе!'
                    })}
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
