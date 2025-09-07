import React, { useState } from 'react'
import { Button, Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, setLocale, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar, ObjectPhotoTable, PhotoGallery, PhotoLightbox } from '@/components/common'
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
    const { t } = useTranslation()

    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>(0)

    const equipmentList = [
        {
            title: t('pages.observatory.equipment-list.mount.title', {
                defaultValue: 'Монтировка: Sky-Watcher EQ6'
            }),
            description: t('pages.observatory.equipment-list.mount.description', {
                defaultValue:
                    'Надёжная и точная монтировка, обеспечивающая стабильность телескопа даже при длительных экспозициях.'
            })
        },
        {
            title: t('pages.observatory.equipment-list.telescope.title', {
                defaultValue: 'Телескоп: Sky-Watcher BK2001P'
            }),
            description: t('pages.observatory.equipment-list.telescope.description', {
                defaultValue:
                    'Рефлекторный телескоп с апертурой 200 мм, идеально подходящий для наблюдений за объектами глубокого космоса.'
            })
        },
        {
            title: t('pages.observatory.equipment-list.main-camera.title', {
                defaultValue: 'Основная камера: ASI ZWO 6200MM Pro'
            }),
            description: t('pages.observatory.equipment-list.main-camera.description', {
                defaultValue:
                    'Высокочувствительная астрономическая камера с разрешением 24 МП, способная захватывать мельчайшие детали далёких объектов.'
            })
        },
        {
            title: t('pages.observatory.equipment-list.guide-camera.title', {
                defaultValue: 'Гид-камера: QHY QHY5'
            }),
            description: t('pages.observatory.equipment-list.guide-camera.description', {
                defaultValue: 'Камера для точного наведения и слежения за объектами.'
            })
        },
        {
            title: t('pages.observatory.equipment-list.guide-scope.title', {
                defaultValue: 'Гид-телескоп: SV106 Guide Scope 50mm (Helical Focuser)'
            }),
            description: t('pages.observatory.equipment-list.guide-scope.description', {
                defaultValue: 'Компактный телескоп для гидирования при съемках с длинными выдержками.'
            })
        },
        {
            title: t('pages.observatory.equipment-list.focuser.title', { defaultValue: 'Фокусер: ZWO EAF' }),
            description: t('pages.observatory.equipment-list.focuser.description', {
                defaultValue: 'Электронный фокусер, обеспечивающий точную настройку фокусировки.'
            })
        },
        {
            title: t('pages.observatory.equipment-list.filter-wheel.title', {
                defaultValue: 'Колесо фильтров: ZWO EFW 8x31mm'
            }),
            description: t('pages.observatory.equipment-list.filter-wheel.description', {
                defaultValue: 'Универсальное колесо фильтров для работы с различными спектральными диапазонами.'
            })
        },
        {
            title: t('pages.observatory.equipment-list.filters.title', {
                defaultValue: 'Фильтры: ZWO L, R, G, B, Ha, OIII, SII (1.25")'
            }),
            description: t('pages.observatory.equipment-list.filters.description', {
                defaultValue: 'Набор фильтров для получения цветных изображений и съёмки в узких спектрах.'
            })
        },
        {
            title: t('pages.observatory.equipment-list.coma-corrector.title', {
                defaultValue: 'Корректор комы: Baader 2" Mark III MPCC'
            }),
            description: t('pages.observatory.equipment-list.coma-corrector.description', {
                defaultValue: 'Устраняет оптические искажения, обеспечивая чёткость изображения.'
            })
        }
    ]

    const handlePhotoClick = (index: number) => {
        setPhotoIndex(index)
        setShowLightbox(true)
    }

    const handleHideLightbox = () => {
        setShowLightbox(false)
    }

    return (
        <AppLayout
            canonical={'observatory/overview'}
            title={t('pages.observatory.title', { defaultValue: 'Обсерватория в Оренбурге' })}
            description={t('pages.observatory.description', {
                defaultValue:
                    'Самодельная астрономическая обсерватория расположена в пригороде Оренбурга, всего в 15 км от города. Благодаря своему удалению от городской застройки, обсерватория находится в зоне с уровнем светового загрязнения 5 класса по шкале Бортля, что делает её не плохим местом в пригорде для наблюдений за ночным небом.'
            })}
            openGraph={{
                images: [
                    {
                        height: 854,
                        url: '/screenshots/observatory.jpg',
                        width: 1280
                    }
                ]
            }}
        >
            <AppToolbar
                title={t('pages.observatory.title', { defaultValue: 'Обсерватория в Оренбурге' })}
                currentPage={t('pages.observatory.title', { defaultValue: 'Обсерватория в Оренбурге' })}
                links={[
                    {
                        link: '/observatory',
                        text: t('menu.observatory')
                    }
                ]}
            />

            <p>
                {t('pages.observatory.description', {
                    defaultValue:
                        'Самодельная астрономическая обсерватория расположена в пригороде Оренбурга, всего в 15 км от города. Благодаря своему удалению от городской застройки, обсерватория находится в зоне с уровнем светового загрязнения 5 класса по шкале Бортля, что делает её не плохим местом в пригорде для наблюдений за ночным небом.'
                })}
            </p>

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ marginTop: 0 }}>
                    {t('pages.observatory.description-1', {
                        defaultValue:
                            'Основное направление деятельности обсерватории - фотографирование объектов глубокого космоса (deep-sky), таких как туманности, галактики и звёздные скопления. Оборудование и технологии, используемые в обсерватории, позволяют получать высококачественные изображения, которые могут использоваться как для научных исследований, так и для образовательных целей.'
                    })}
                </p>
                <p>
                    {t('pages.observatory.description-2', {
                        defaultValue:
                            'Обсерватория функционирует в полуавтоматическом режиме, что позволяет управлять ею удалённо из любой точки мира через Интернет. Это делает её доступной для астрономов-любителей, исследователей и энтузиастов со всего мира.'
                    })}
                </p>

                <PhotoGallery
                    photos={galleryObservatory}
                    onClick={({ index }) => {
                        handlePhotoClick(index)
                    }}
                />

                <p>
                    {t('pages.observatory.description-3', {
                        defaultValue:
                            'Обсерватория открыта для сотрудничества с астрономами-любителями, исследователями и образовательными учреждениями. Мы рады предоставить доступ к нашим данным для научных и образовательных целей. Если вы хотите стать частью нашего сообщества или использовать наши ресурсы для своих проектов, свяжитесь с нами через форму обратной связи.'
                    })}
                </p>
                <p style={{ marginBottom: 0 }}>
                    {t('pages.observatory.description-4', {
                        defaultValue:
                            'Оренбургская обсерватория - это уникальное сочетание современных технологий и энтузиазма астрономов-любителей. Мы стремимся сделать астрономию доступной для всех, кто интересуется загадками Вселенной. Присоединяйтесь к нам, чтобы вместе исследовать бескрайние просторы космоса!'
                    })}
                </p>
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>
                    {t('pages.observatory.equipment-title', {
                        defaultValue: 'Оборудование обсерватории'
                    })}
                </h2>
                <p>
                    {t('pages.observatory.equipment-description', {
                        defaultValue:
                            'Используемые инструменты и технологии обеспечивают высокую точность наблюдений и профессиональное качество снимков. Вот основное оборудование, которое используется в работе:'
                    })}
                </p>
                <ul>
                    {equipmentList.map((item, index: number) => (
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
                <h2 style={{ marginTop: 0 }}>
                    {t('pages.observatory.photos-and-data-title', { defaultValue: 'Фотографии и данные' })}
                </h2>
                <p>
                    {t('pages.observatory.photos-and-data', {
                        defaultValue:
                            'На специальном разделе сайта представлены <photosLink>фотографии</photosLink> снятых <objectsLink>объектов</objectsLink> глубокого космоса. Для каждого объекта доступны подробные параметры и характеристики, такие как расстояние до объекта, его размер, спектральные данные и многое другое. Эти материалы могут быть полезны как для начинающих астрономов, так и для профессионалов.',
                        photosLink: (
                            <Link
                                href='/photos'
                                title={t('menu.astrophoto')}
                            >
                                {t('pages.observatory.photos-and-data-part-photos')}
                            </Link>
                        ),
                        objectsLink: (
                            <Link
                                href='/objects'
                                title={t('pages.observatory.photos-and-data-part-objects', {
                                    defaultValue: 'объектов'
                                })}
                            >
                                {t('pages.observatory.photos-and-data-part-objects', { defaultValue: 'объектов' })}
                            </Link>
                        )
                    })}
                </p>

                <ObjectPhotoTable photosList={photosList} />

                <Button
                    size={'medium'}
                    mode={'secondary'}
                    link={'/photos'}
                    title={t('pages.observatory.astrophoto', { defaultValue: 'Астрофото' })}
                >
                    {t('pages.observatory.photos-and-data-all-photos', {
                        defaultValue: 'Все астрономические фотографии'
                    })}
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
