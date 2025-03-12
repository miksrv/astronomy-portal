import { API, ApiModel, SITE_LINK } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { wrapper } from '@/api/store'
import { GetServerSidePropsResult, NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'
import React, { useState } from 'react'
import Gallery from 'react-photo-gallery'
import { Container } from 'simple-react-ui-kit'

import AppFooter from '@/components/app-footer'
import AppLayout from '@/components/app-layout'
import AppToolbar from '@/components/app-toolbar'
import ObjectPhotoTable from '@/components/object-photos-table'
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

const galleryObservatory = [
    photoObservatory3,
    photoObservatory7,
    photoObservatory5,
    photoObservatory6
]

const galleryEquipment = [
    photoObservatory9,
    photoObservatory10,
    photoObservatory11,
    photoObservatory12
]

const galleryControl = [photoObservatory1, photoObservatory2, photoObservatory4]

const allPhotos = [
    ...galleryObservatory,
    ...galleryEquipment,
    ...galleryControl
]

interface ObservatoryOverviewPageProps {
    photosList: ApiModel.Photo[]
}

const ObservatoryOverviewPage: NextPage<ObservatoryOverviewPageProps> = ({
    photosList
}) => {
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
                title={t('observatory')}
                description={t('description-observatory')}
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
                title={'Общая информация'}
                currentPage={'Общая информация'}
                links={[
                    {
                        link: '/observatory',
                        text: t('observatory')
                    }
                ]}
            />

            <p>
                Самодельная астрономическая обсерватория расположена в пригороде
                Оренбурга, всего в 15 км от города. Благодаря своему удалению от
                городской застройки, обсерватория находится в зоне с уровнем
                светового загрязнения 5 класса по шкале Бортля, что делает её
                идеальным местом в пригорде для наблюдений за ночным небом.
            </p>

            <Container style={{ marginBottom: '10px' }}>
                <p style={{ marginTop: 0 }}>
                    Основное направление деятельности обсерватории -
                    фотографирование объектов глубокого космоса (deep-sky),
                    таких как туманности, галактики и звёздные скопления.
                    Оборудование и технологии, используемые в обсерватории,
                    позволяют получать высококачественные изображения, которые
                    могут использоваться как для научных исследований, так и для
                    образовательных целей.
                </p>

                <p>
                    Обсерватория функционирует в полуавтоматическом режиме, что
                    позволяет управлять ею удалённо из любой точки мира через
                    Интернет. Это делает её доступной для астрономов-любителей,
                    исследователей и энтузиастов со всего мира.
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
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>Оборудование обсерватории</h2>
                <p>
                    Используемые инструменты и технологии обеспечивают высокую
                    точность наблюдений и профессиональное качество снимков. Вот
                    основное оборудование, которое используется в работе:
                </p>
                <ul>
                    <li>
                        <h3>Монтировка: Sky-Watcher EQ6</h3>
                        <div>
                            Надёжная и точная монтировка, обеспечивающая
                            стабильность телескопа даже при длительных
                            экспозициях.
                        </div>
                    </li>
                    <li>
                        <h3>Телескоп: Sky-Watcher BK2001P</h3>
                        <div>
                            Рефлекторный телескоп с апертурой 200 мм, идеально
                            подходящий для наблюдений за объектами глубокого
                            космоса.
                        </div>
                    </li>
                    <li>
                        <h3>Основная камера: ASI ZWO 6200MM Pro</h3>
                        <div>
                            Высокочувствительная астрономическая камера с
                            разрешением 24 МП, способная захватывать мельчайшие
                            детали далёких объектов.
                        </div>
                    </li>
                    <li>
                        <h3>Гид-камера: QHY QHY5</h3>
                        <div>
                            Камера для точного наведения и слежения за
                            объектами.
                        </div>
                    </li>
                    <li>
                        <h3>
                            Гид-телескоп: SV106 Guide Scope 50mm (Helical
                            Focuser)
                        </h3>
                        <div>Компактный телескоп для автонаведения.</div>
                    </li>
                    <li>
                        <h3>Фокусер: ZWO EAF</h3>
                        <div>
                            Электронный фокусер, обеспечивающий точную настройку
                            фокусировки.
                        </div>
                    </li>
                    <li>
                        <h3>Колесо фильтров: ZWO EFW 8x31mm</h3>
                        <div>
                            Универсальное колесо фильтров для работы с
                            различными спектральными диапазонами.
                        </div>
                    </li>
                    <li>
                        <h3>Фильтры: ZWO L, R, G, B, Ha, OIII, SII (1.25")</h3>
                        <div>
                            Набор фильтров для получения цветных изображений и
                            съёмки в узких спектрах.
                        </div>
                    </li>
                    <li>
                        <h3>Корректор комы: BAADER MPCC</h3>
                        <div>
                            Устраняет оптические искажения, обеспечивая чёткость
                            изображения.
                        </div>
                    </li>
                </ul>
                <Gallery
                    photos={galleryEquipment}
                    columns={4}
                    direction={'row'}
                    targetRowHeight={200}
                    onClick={(event, photos) => {
                        handlePhotoClick(photos.index)
                    }}
                />
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>Принцип работы</h2>
                <p>
                    Управление обсерваторией осуществляется через сервер на базе
                    Lenovo M710Q TINY (Pentium G4400T, 8GB RAM, 128GB SSD +
                    512GB HDD) с операционной системой Linux Ubuntu Server
                    22.04. За контроль и координацию всех процессов отвечает
                    INDI — универсальный инструмент для управления
                    астрономическим оборудованием.
                </p>
                <p>
                    Для удалённого доступа используется SSH для безопасного
                    подключения к серверу, VNC для графического интерфейса,
                    VirtualBox для работы с виртуальными машинами. Это позволяет
                    управлять обсерваторией из любой точки мира, не требуя
                    физического присутствия.
                </p>
                <p>
                    Обсерватория функционирует в полуавтоматическом режиме.
                    Возможны два способа работы:
                </p>
                <ul>
                    <li>
                        <h3>Ручной режим:</h3>
                        <div>
                            Пользователь может напрямую подключиться к системе
                            через INDI для управления телескопом и камерой. Этот
                            режим идеально подходит для любителей, которые хотят
                            самостоятельно настроить оборудование.
                        </div>
                    </li>
                    <li>
                        <h3>Автоматический режим:</h3>
                        <div>
                            В этом режиме создаются задания в планировщике INDI,
                            после чего система автономно выполняет их. Решение о
                            начале съёмки принимается на основе данных от
                            метеостанции, которая контролирует погодные условия.
                        </div>
                    </li>
                </ul>
                <p>
                    Решение о начале съёмки принимается на основе данных от
                    метеостанции. Крыша обсерватории выполнена по технологии
                    Roll-off Roof (откатная) и управляется моторизированным
                    контроллером, подключённым к серверу. Управление крышей
                    возможно как в автоматическом, так и в ручном режиме.
                </p>
                <Gallery
                    photos={galleryControl}
                    columns={4}
                    direction={'row'}
                    targetRowHeight={200}
                    onClick={(event, photos) => {
                        handlePhotoClick(photos.index)
                    }}
                />
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <h2 style={{ marginTop: 0 }}>Фотографии и данные</h2>
                <p>
                    На специальном разделе нашего сайта представлены фотографии
                    снятых объектов глубокого космоса. Для каждого объекта
                    доступны подробные параметры и характеристики, такие как
                    расстояние до объекта, его размер, спектральные данные и
                    многое другое. Эти материалы могут быть полезны как для
                    начинающих астрономов, так и для профессионалов.
                </p>

                <ObjectPhotoTable photosList={photosList} />
            </Container>

            <Container style={{ marginBottom: '10px' }}>
                <p>
                    Обсерватория открыта для сотрудничества с
                    астрономами-любителями, исследователями и образовательными
                    учреждениями. Мы рады предоставить доступ к нашим данным для
                    научных и образовательных целей. Если вы хотите стать частью
                    нашего сообщества или использовать наши ресурсы для своих
                    проектов, свяжитесь с нами через форму обратной связи.
                </p>
                <p>
                    Наша обсерватория — это уникальное сочетание современных
                    технологий и энтузиазма астрономов-любителей. Мы стремимся
                    сделать астрономию доступной для всех, кто интересуется
                    загадками Вселенной. Присоединяйтесь к нам, чтобы вместе
                    исследовать бескрайние просторы космоса!
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
        async (
            context
        ): Promise<GetServerSidePropsResult<ObservatoryOverviewPageProps>> => {
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
