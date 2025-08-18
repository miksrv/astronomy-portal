import React, { useState } from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import styles from './styles.module.sass'

export type MenuItemType = {
    link: string
    text: string
    external?: boolean
    subMenuItems?: MenuItemType[]
}

interface MenuProps {
    className?: string
    sidebarMenu?: boolean
    onClick?: () => void
}

export const Menu: React.FC<MenuProps> = ({ className, sidebarMenu, onClick }) => {
    const router = useRouter()
    const { t } = useTranslation()

    const [dropdownOpen, setDropdownOpen] = useState<number>()

    const menuItems: MenuItemType[] = [
        {
            link: '/photos',
            text: t('astrophoto')
        },
        {
            link: '/objects',
            text: t('objects')
        },
        {
            link: '/stargazing',
            text: t('stargazing'),
            subMenuItems: [
                {
                    link: '/stargazing/rules',
                    text: t('stargazing-rules')
                },
                {
                    link: '/stargazing/howto',
                    text: t('stargazing-howto')
                },
                {
                    link: '/stargazing/where',
                    text: t('stargazing-where')
                },
                {
                    link: '/stargazing/faq',
                    text: t('stargazing-faq')
                }
            ]
        },
        {
            link: '/observatory',
            text: t('observatory'),
            subMenuItems: [
                {
                    link: '/observatory/overview',
                    text: t('observatory-orenburg')
                },
                {
                    link: '/observatory/weather',
                    text: t('observatory-orenburg-weather')
                }
            ]
        },
        {
            link: '/starmap',
            text: t('star-map')
        },
        {
            link: '/about',
            text: t('about')
        },
        {
            link: 'https://t.me/look_at_stars',
            text: t('telegram')
        }
    ]

    const handleMouseEnter = (i: number) => {
        setDropdownOpen(i)
    }

    const handleMouseLeave = () => {
        setDropdownOpen(undefined)
    }

    return (
        <menu className={cn(className, styles.menu, sidebarMenu && styles.sidebarMenu)}>
            {menuItems
                .filter(({ link }) => !!link)
                .map((item, i) => (
                    <li
                        key={`menu${i}`}
                        onMouseEnter={() => handleMouseEnter(i)}
                        onMouseLeave={handleMouseLeave}
                    >
                        <Link
                            className={router.asPath === item.link ? styles.active : undefined}
                            href={item.link}
                            title={item.text}
                            onClick={() => onClick?.()}
                            target={item.external ? '_blank' : undefined}
                        >
                            {item.text}
                            {item.subMenuItems && !sidebarMenu ? (
                                dropdownOpen === i ? (
                                    <Icon
                                        name={'KeyboardUp'}
                                        className={styles.arrow}
                                    />
                                ) : (
                                    <Icon
                                        name={'KeyboardDown'}
                                        className={styles.arrow}
                                    />
                                )
                            ) : (
                                ''
                            )}
                        </Link>
                        {item.subMenuItems && (dropdownOpen === i || sidebarMenu) && (
                            <ul className={styles.dropdownMenu}>
                                {item.subMenuItems.map((subItem, j) => (
                                    <li key={`submenu${j}`}>
                                        <Link
                                            className={router.asPath === subItem.link ? styles.active : undefined}
                                            href={subItem.link}
                                            title={subItem.text}
                                            onClick={() => onClick?.()}
                                            target={subItem.external ? '_blank' : undefined}
                                        >
                                            {subItem.text}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
        </menu>
    )
}
