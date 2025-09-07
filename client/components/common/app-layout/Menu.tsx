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
    const { t } = useTranslation()
    const router = useRouter()

    const [dropdownOpen, setDropdownOpen] = useState<number>()

    const menuItems: MenuItemType[] = [
        {
            link: '/photos',
            text: t('menu.astrophoto', { defaultValue: 'Астрофото' })
        },
        {
            link: '/objects',
            text: t('menu.objects', { defaultValue: 'Объекты' })
        },
        {
            link: '/stargazing',
            text: t('menu.stargazing', { defaultValue: 'Астровыезды' }),
            subMenuItems: [
                {
                    link: '/stargazing/rules',
                    text: t('menu.stargazing-rules', { defaultValue: 'Правила поведения на астровыездах' })
                },
                {
                    link: '/stargazing/howto',
                    text: t('menu.stargazing-howto', { defaultValue: 'Как проходят астровыезды' })
                },
                {
                    link: '/stargazing/where',
                    text: t('menu.stargazing-where', { defaultValue: 'Где посмотреть в телескоп в Оренбурге' })
                },
                {
                    link: '/stargazing/faq',
                    text: t('menu.stargazing-faq', { defaultValue: 'Часто задаваемые вопросы' })
                }
            ]
        },
        {
            link: '/observatory',
            text: t('menu.observatory', { defaultValue: 'Обсерватория' }),
            subMenuItems: [
                {
                    link: '/observatory/overview',
                    text: t('menu.observatory-orenburg', { defaultValue: 'Обсерватория в Оренбурге' })
                },
                {
                    link: '/observatory/weather',
                    text: t('menu.observatory-orenburg-weather', { defaultValue: 'Погода в Обсерватории Оренбурга' })
                }
            ]
        },
        {
            link: '/starmap',
            text: t('menu.star-map', { defaultValue: 'Звёздная карта' })
        },
        {
            link: '/about',
            text: t('menu.about', { defaultValue: 'О проекте' })
        },
        {
            link: 'https://t.me/look_at_stars',
            text: t('menu.telegram', { defaultValue: 'Телеграм' })
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
