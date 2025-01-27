import { useTranslation } from 'next-i18next'
import Image, { StaticImageData } from 'next/image'
import React from 'react'

import photoIgor from '@/public/photos/team-Igor.jpg'
import photoMisha from '@/public/photos/team-Misha.jpg'
import photoSergey from '@/public/photos/team-Sergey.jpg'
import photoTanya from '@/public/photos/team-Tanya.jpg'
import photoVladimir from '@/public/photos/team-Vladimir.jpg'
import photoZhenya from '@/public/photos/team-Zhenya.jpg'

import styles from './styles.module.sass'

type TeamMemberType = {
    name?: string
    photo?: StaticImageData
}

const Team: React.FC = () => {
    const { t } = useTranslation()

    const teamList: TeamMemberType[] = [
        {
            name: t('about-page.team-members.mike'),
            photo: photoMisha
        },
        {
            name: t('about-page.team-members.tanya'),
            photo: photoTanya
        },
        {
            name: t('about-page.team-members.igor'),
            photo: photoIgor
        },
        {
            name: t('about-page.team-members.sergey'),
            photo: photoSergey
        },
        {
            name: t('about-page.team-members.eugene'),
            photo: photoZhenya
        },
        {
            name: t('about-page.team-members.vladimir'),
            photo: photoVladimir
        }
    ]

    return (
        <div className={styles.section}>
            {teamList?.map((item) => (
                <div
                    key={item.name}
                    className={styles.item}
                    role={'listitem'}
                >
                    <Image
                        className={styles.photo}
                        src={item.photo?.src!}
                        alt={item?.name ?? ''}
                        width={item.photo?.width}
                        height={item.photo?.height}
                    />
                    <div className={styles.title}>{item.name}</div>
                </div>
            ))}
        </div>
    )
}

export default Team
