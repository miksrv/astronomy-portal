import React, { useState } from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

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
    const { t } = useTranslation()
    const router = useRouter()

    const [dropdownOpen, setDropdownOpen] = useState<number>()

    const menuItems: MenuItemType[] = [
        {
            link: '/photos',
            text: t('menu.astrophoto', 'Астрофото')
        },
        {
            link: '/objects',
            text: t('menu.objects', 'Объекты')
        },
        {
            link: '/stargazing',
            text: t('menu.stargazing', 'Астровыезды'),
            subMenuItems: [
                {
                    link: '/stargazing/tickets',
                    text: t('menu.stargazing-tickets', 'Билеты и поддержка')
                },
                {
                    link: '/stargazing/rules',
                    text: t('menu.stargazing-rules', 'Правила')
                },
                {
                    link: '/stargazing/howto',
                    text: t('menu.stargazing-howto', 'Как проходят')
                },
                {
                    link: '/stargazing/where',
                    text: t('menu.stargazing-where', 'Место проведения')
                },
                {
                    link: '/stargazing/faq',
                    text: t('menu.stargazing-faq', 'Вопросы и ответы')
                }
            ]
        },
        {
            link: '/observatory',
            text: t('menu.observatory', 'Обсерватория'),
            subMenuItems: [
                {
                    link: '/observatory/overview',
                    text: t('menu.observatory-orenburg', 'Об обсерватории')
                },
                {
                    link: '/observatory/weather',
                    text: t('menu.observatory-orenburg-weather', 'Погода')
                },
                {
                    link: '/observatory/history',
                    text: t('menu.observatory-history', 'История')
                }
            ]
        },
        {
            link: '/starmap',
            text: t('menu.star-map', 'Звёздная карта')
        },
        {
            link: '/about',
            text: t('menu.about', 'О проекте')
        },
        {
            link: 'https://t.me/look_at_stars',
            text: t('menu.telegram', 'Телеграм')
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
                            className={
                                item.subMenuItems
                                    ? router.asPath === item.link || router.asPath.startsWith(item.link + '/')
                                        ? styles.active
                                        : undefined
                                    : router.asPath === item.link
                                      ? styles.active
                                      : undefined
                            }
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
