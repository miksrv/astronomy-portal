import React from 'react'

import Image from 'next/image'
import { useTranslation } from 'next-i18next/pages'

import photoArrival from '@/public/photos/howto-1.jpeg'
import photoLecture from '@/public/photos/howto-2.jpeg'
import photoTelescope from '@/public/photos/howto-4.jpeg'
import photoSky from '@/public/photos/stargazing-3.jpeg'

import styles from './styles.module.sass'

export const EventProgram: React.FC = () => {
    const { t } = useTranslation()

    const steps = [
        {
            image: photoArrival,
            title: t('pages.stargazing.program-arrival-title', 'Прибытие на место'),
            description: t(
                'pages.stargazing.program-arrival-desc',
                'Приезжайте на машине за 15–20 минут до начала и занимайте удобное место на поляне в отведенных местах.'
            )
        },
        {
            image: photoLecture,
            title: t('pages.stargazing.program-lecture-title', 'Астролекция'),
            description: t(
                'pages.stargazing.program-lecture-desc',
                'С наступлением сумерек - увлекательная лекция о космосе на большом экране, около часа.'
            )
        },
        {
            image: photoSky,
            title: t('pages.stargazing.program-sky-title', 'Звёздное небо'),
            description: t(
                'pages.stargazing.program-sky-desc',
                'Учимся находить яркие звёзды и созвездия прямо на ночном небе над головой.'
            )
        },
        {
            image: photoTelescope,
            title: t('pages.stargazing.program-telescope-title', 'Наблюдения в телескопы'),
            description: t(
                'pages.stargazing.program-telescope-desc',
                'Несколько телескопов наведены на разные объекты - смотрите и задавайте вопросы астрономам.'
            )
        }
    ]

    return (
        <div className={styles.grid}>
            {steps.map((step, index) => (
                <article
                    key={step.title}
                    className={styles.card}
                >
                    <div className={styles.imageWrapper}>
                        <Image
                            className={styles.image}
                            src={step.image}
                            alt={step.title}
                            placeholder={'blur'}
                            sizes={'(max-width: 600px) 100vw, 25vw'}
                            fill
                        />
                        <span className={styles.number}>{index + 1}</span>
                    </div>

                    <h3 className={styles.title}>{step.title}</h3>
                    <p className={styles.description}>{step.description}</p>
                </article>
            ))}
        </div>
    )
}
