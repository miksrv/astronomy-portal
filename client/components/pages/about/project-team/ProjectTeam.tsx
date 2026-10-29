import React, { useEffect, useState } from 'react'

import Image, { StaticImageData } from 'next/image'
import { useTranslation } from 'next-i18next/pages'

import { Carousel } from '@/components/ui'
import photoIgor from '@/public/photos/team-Igor.jpg'
import photoMisha from '@/public/photos/team-Misha.jpg'
import photoNikolay from '@/public/photos/team-Nikolay.jpg'
import photoSergey from '@/public/photos/team-Sergey.jpg'
import photoTanya from '@/public/photos/team-Tanya.jpg'
import photoVladimir from '@/public/photos/team-Vladimir.jpg'
import photoZhenya from '@/public/photos/team-Zhenya.jpg'
import { prefersReducedMotion } from '@/utils/helpers'

import styles from './styles.module.sass'

type TeamMemberType = {
    name?: string
    photo?: StaticImageData
}

export const ProjectTeam: React.FC = () => {
    const { t } = useTranslation()

    // The slow auto-scroll is motion: off for visitors who ask for less of it
    const [autoScroll, setAutoScroll] = useState<boolean>(false)

    useEffect(() => {
        setAutoScroll(!prefersReducedMotion())
    }, [])

    const teamList: TeamMemberType[] = [
        {
            name: t('components.pages.about.project-team.mikhail', 'Михаил Топчило'),
            photo: photoMisha
        },
        {
            name: t('components.pages.about.project-team.tatiana', 'Татьяна Гавриш'),
            photo: photoTanya
        },
        {
            name: t('components.pages.about.project-team.igor', 'Игорь Комиссарчик'),
            photo: photoIgor
        },
        {
            name: t('components.pages.about.project-team.sergey', 'Сергей Медведев'),
            photo: photoSergey
        },
        {
            name: t('components.pages.about.project-team.eugene', 'Евгений Зимин'),
            photo: photoZhenya
        },
        {
            name: t('components.pages.about.project-team.vladimir', 'Владимир Иванович'),
            photo: photoVladimir
        },
        {
            name: t('components.pages.about.project-team.nikolay', 'Николай Черепанов'),
            photo: photoNikolay
        }
    ]

    return (
        <Carousel
            options={{ dragFree: true, loop: true }}
            autoScroll={autoScroll}
            slideSize={'190px'}
            className={styles.carousel}
        >
            {teamList?.map((item) => (
                <div
                    key={item.name}
                    className={styles.item}
                >
                    <Image
                        className={styles.photo}
                        src={item.photo?.src || ''}
                        alt={item?.name || ''}
                        width={item.photo?.width}
                        height={item.photo?.height}
                    />
                    <div className={styles.title}>{item.name}</div>
                </div>
            ))}
        </Carousel>
    )
}
