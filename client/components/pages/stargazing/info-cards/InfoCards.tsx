import React from 'react'
import { Icon, IconTypes } from 'simple-react-ui-kit'

import Link from 'next/link'

import styles from './styles.module.sass'

export interface InfoCardItem {
    href: string
    icon: IconTypes
    title: string
    description: string
}

interface InfoCardsProps {
    items: InfoCardItem[]
}

export const InfoCards: React.FC<InfoCardsProps> = ({ items }) => (
    <div className={styles.grid}>
        {items.map((card) => (
            <Link
                key={card.href}
                href={card.href}
                className={styles.card}
            >
                <Icon
                    name={card.icon}
                    className={styles.icon}
                />
                <div>
                    <div className={styles.cardTitle}>{card.title}</div>
                    <div className={styles.cardDesc}>{card.description}</div>
                </div>
            </Link>
        ))}
    </div>
)
