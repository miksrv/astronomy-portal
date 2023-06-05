import Image, { StaticImageData } from 'next/image'
import React from 'react'

import photoMisha from '@/public/photos/team-Misha.jpeg'

import styles from './styles.module.sass'

type TTeam = {
    name?: string
    photo?: StaticImageData
}

const team: TTeam[] = [
    {
        name: 'Татьяна Гавриш',
        photo: photoMisha
    },
    {
        name: 'Игорь Коммисарчик',
        photo: photoMisha
    },
    {
        name: 'Сергей Медведев',
        photo: photoMisha
    },
    {
        name: 'Михаил Топчило',
        photo: photoMisha
    },
    {
        name: 'Евгений Зимин',
        photo: photoMisha
    },
    {
        name: 'Владимир Иванович',
        photo: photoMisha
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
                    alt={item?.name || ''}
                    width={item.photo?.width}
                    height={item.photo?.height}
                />
                <div className={styles.title}>{item.name}</div>
            </div>
        ))}
    </div>
)

export default Team
