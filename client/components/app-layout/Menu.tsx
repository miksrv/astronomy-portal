import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { cn } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

export type MenuItemType = {
    link: string
    text: string
    external?: boolean
}

interface MenuProps {
    className?: string
    onClick?: () => void
}

export const Menu: React.FC<MenuProps> = ({ className, onClick }) => {
    const router = useRouter()
    const { t } = useTranslation()

    const menuItems: MenuItemType[] = [
        {
            link: 'https://t.me/nearspace',
            text: t('blog')
        },
        {
            link: '/celestial',
            text: t('star-map')
        },
        {
            link: '/photos',
            text: t('astrophoto')
        },
        {
            link: '/objects',
            text: t('objects')
        },
        {
            link: '/dashboard',
            text: t('observatory')
        },
        {
            link: '/stargazing',
            text: t('stargazing')
        },
        {
            link: '/about',
            text: t('about')
        }
    ]

    return (
        <menu className={cn(className, styles.menu)}>
            {menuItems
                .filter(({ link }) => !!link)
                .map((item, i) => (
                    <li key={`menu${i}`}>
                        <Link
                            className={
                                router.asPath === item.link
                                    ? styles.active
                                    : undefined
                            }
                            href={item.link}
                            title={item.text}
                            onClick={() => onClick?.()}
                            target={item.external ? '_blank' : undefined}
                        >
                            {item.text}
                        </Link>
                    </li>
                ))}
        </menu>
    )
}
