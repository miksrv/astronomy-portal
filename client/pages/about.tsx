import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import dynamic from 'next/dynamic'
import React, { useState } from 'react'
import Gallery from 'react-photo-gallery'

import Team from '@/components/project-team'

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

const PhotoLightboxOld = dynamic(
    () => import('@/components/photo-lightbox-old/PhotoLightboxOld'),
    {
        ssr: false
    }
)

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

const AboutPage: NextPage = () => {
    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>(0)

    const allPhotos = [
        ...galleryObservatory.map((image) => image.src),
        ...galleryStargazing.map((image) => image.src)
    ]

    const handlePhotoClick = (index: number) => {
        setPhotoIndex(index)
        setShowLightbox(true)
    }

    const handleHideLightbox = () => {
        setShowLightbox(false)
    }

    return (
        <main>
            <NextSeo
                title={'О нас - обсерватория в Оренбурге и Астровыезды'}
                description={
                    'Самодельная астрономическая обсерватория в Оренбурге и астровыезды - это уникальные научно-популяризаторские проекты в Оренбургской области. Целью проектов является создание доступности астрономии для всех желающих. Мы делаем космос ближе!'
                }
                openGraph={{
                    images: [
                        {
                            height: 853,
                            url: '/photos/stargazing-2.jpeg',
                            width: 1280
                        }
                    ],
                    locale: 'ru'
                }}
            />
            <div className={'box section'}>
                <h1>Самодельная астрономическая обсерватория</h1>
                <p>
                    Привет 👋! Этот сайт посвящен нашему любительскому проекту -
                    самодельной астрономической обсерватории, работающей в
                    удаленном режиме. Это уникальный проект в Оренбургской
                    области. Наша обсерватория работает автономно и позволяет
                    получать снимки объектов дальнего космоса. Наша цель -
                    сделать астрономию доступной абсолютно для всех. Поэтому
                    наша обсерватория является открытой для всех желающих -
                    каждый может воспользоваться ей для получения изображений
                    космоса. В ближайшее время на базе этого сайта мы запустим{' '}
                    <strong>бесплатный</strong> сервис управления телескопом.
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
                <br />
                <h2> Наша команда</h2>
                <p>
                    Мы работаем в самых разных сферах, но всех нас объединяет
                    одно - любовь к космосу. С 2016 года мы вместе смотрим на
                    звезды, популяризируем астрономию и развиваем наши проекты.
                </p>
                <Team />
                <h2>Астрономический проект &quot;Смотри на звезды&quot;</h2>
                <p>
                    В 2016 году в Оренбургской области мы запустили
                    научно-популярный проект под названием «Смотри на звезды». С
                    тех пор каждый сезон наша команда устраивает бесплатные
                    астрономические лекции под открытым небом. Мы выезжаем за
                    город с телескопами, проводим астролекторий и организуем
                    вечера тротуарной астрономии. Целью проекта является
                    создание доступной астрономии для всех желающих. Мы делаем
                    космос ближе!
                </p>
                <p>
                    Наш проект «Смотри на звезды» с первых дней привлек внимание
                    широкой аудитории. Мы стремимся разбудить интерес к космосу
                    у детей, подростков и взрослых, показывая им его величие и
                    загадочность. Главная идея заключается в том, чтобы каждый
                    человек смог насладиться ночным небом и проникнуться
                    чудесами Вселенной с помощью наших вечеров астрономии и
                    астровыездов.
                </p>
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
                <br />
                <p>
                    Наши мероприятия охватывают не только города и поселки
                    Оренбургской области, но и соседние регионы. Мы организуем
                    выездные экскурсии в удаленные места, где нет сильного
                    светового загрязнения, что позволяет наблюдать звезды во
                    всей их красе. Наша команда астрономов, волонтеров и научных
                    работников всегда готова поделиться своими знаниями и
                    опытом, чтобы каждый желающий мог лучше понять и полюбить
                    астрономию.
                </p>
                <p>
                    Одной из ключевых составляющих проекта являются лекции,
                    которые проводят опытные астрономы-любители. Мы рассказываем
                    о научных открытиях, об истории астрономии и ее современных
                    достижениях. Лекции не только позволяют расширить знания
                    слушателей, но и вдохновляют на дальнейшее изучение этой
                    удивительной науки. Все лекции проводим в простом формате.
                    Рассказываем аудитории сложные вещи простым языком.
                </p>
                <p>
                    Особое внимание мы уделяем вечерам тротуарной астрономии.
                    Это неформальные встречи, которые проводятся под открытым
                    небом в самых доступных местах города.
                </p>
                <h2>Ваша помощь</h2>
                <p>
                    Большой вклад в развитие проекта «Смотри на звезды» делает
                    поддержка программы социальных инвестиций «Родные города»
                    компании «Газпром нефть» и команда информационного агентства
                    «Оренбург Медиа».
                </p>
                <p>
                    Наш астрономический проект самодельной обсерватории также
                    поддержало множество участников! У нас масштабные планы по
                    развитию этого проекта. А наша обсерватория всегда нуждается
                    в вашей поддержке.
                </p>
                <h3>Финансовая поддержка:</h3>
                <ul>
                    {contributors1.map((name) => (
                        <li key={name}>{name}</li>
                    ))}
                </ul>
                <h3>Техническая и программная поддержка:</h3>
                <ul>
                    {contributors2.map((name) => (
                        <li key={name}>{name}</li>
                    ))}
                </ul>
                <p>
                    Большое спасибо всем, кто помогал советами, консультациями и
                    рекомендациями, если кого не включили в список - пожалуйста,
                    напишите, это важно. Благодаря вам - космос действительно
                    становится ближе!
                </p>
            </div>
            <PhotoLightboxOld
                photos={allPhotos}
                photoIndex={photoIndex}
                showLightbox={showLightbox}
                onCloseLightBox={handleHideLightbox}
                onChangeIndex={setPhotoIndex}
            />
        </main>
    )
}

export default AboutPage
