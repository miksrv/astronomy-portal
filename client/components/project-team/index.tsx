import Image, { StaticImageData } from 'next/image'
import React from 'react'

import photoIgor from '@/public/photos/team-Igor.jpg'
import photoMisha from '@/public/photos/team-Misha.jpg'
import photoSergey from '@/public/photos/team-Sergey.jpg'
import photoTanya from '@/public/photos/team-Tanya.jpg'
import photoVladimir from '@/public/photos/team-Vladimir.jpg'
import photoZhenya from '@/public/photos/team-Zhenya.jpg'

import styles from './styles.module.sass'

type TTeam = {
    name?: string
    photo?: StaticImageData
}

const team: TTeam[] = [
    {
        name: 'Татьяна Гавриш',
        photo: photoTanya
    },
    {
        name: 'Игорь Коммиссарчик',
        photo: photoIgor
    },
    {
        name: 'Сергей Медведев',
        photo: photoSergey
    },
    {
        name: 'Михаил Топчило',
        photo: photoMisha
    },
    {
        name: 'Евгений Зимин',
        photo: photoZhenya
    },
    {
        name: 'Владимир Иванович',
        photo: photoVladimir
    }
]

const Team: React.FC = () => (
    <div className={styles.section}>
        {team?.map((item) => (
            <div
                key={item.name}
                className={styles.item}
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

export default Team
