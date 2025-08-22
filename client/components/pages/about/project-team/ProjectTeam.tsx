import React from 'react'

import Image, { StaticImageData } from 'next/image'
import { useTranslation } from 'next-i18next'

import { Carousel } from '@/components/ui'
import photoIgor from '@/public/photos/team-Igor.jpg'
import photoMisha from '@/public/photos/team-Misha.jpg'
import photoNikolay from '@/public/photos/team-Nikolay.jpg'
import photoSergey from '@/public/photos/team-Sergey.jpg'
import photoTanya from '@/public/photos/team-Tanya.jpg'
import photoVladimir from '@/public/photos/team-Vladimir.jpg'
import photoZhenya from '@/public/photos/team-Zhenya.jpg'

import styles from './styles.module.sass'

type TeamMemberType = {
    name?: string
    photo?: StaticImageData
}

export const ProjectTeam: React.FC = () => {
    const { t } = useTranslation()

    const teamList: TeamMemberType[] = [
        {
            name: t('components.pages.about.project-team.mikhail', { defaultValue: 'Михаил Топчило' }),
            photo: photoMisha
        },
        {
            name: t('components.pages.about.project-team.tatiana', { defaultValue: 'Татьяна Гавриш' }),
            photo: photoTanya
        },
        {
            name: t('components.pages.about.project-team.igor', { defaultValue: 'Игорь Комиссарчик' }),
            photo: photoIgor
        },
        {
            name: t('components.pages.about.project-team.sergey', { defaultValue: 'Сергей Медведев' }),
            photo: photoSergey
        },
        {
            name: t('components.pages.about.project-team.eugene', { defaultValue: 'Евгений Зимин' }),
            photo: photoZhenya
        },
        {
            name: t('components.pages.about.project-team.vladimir', { defaultValue: 'Владимир Иванович' }),
            photo: photoVladimir
        },
        {
            name: t('components.pages.about.project-team.nikolay', { defaultValue: 'Николай Черепанов' }),
            photo: photoNikolay
        }
    ]

    return (
        <div className={styles.section}>
            <Carousel
                options={{ dragFree: true, loop: true }}
                autoScroll={true}
            >
                {teamList?.map((item) => (
                    <div
                        key={item.name}
                        className={styles.item}
                        role={'listitem'}
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
        </div>
    )
}
