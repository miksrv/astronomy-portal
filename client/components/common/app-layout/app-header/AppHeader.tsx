import React, { useEffect, useState } from 'react'
import { Button, cn, Icon, Popout } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, HOST_IMG, useAppDispatch, useAppSelector } from '@/api'
import { openAuthDialog } from '@/api/applicationSlice'
import { login, logout } from '@/api/authSlice'
import { UserAvatar } from '@/components/ui/user-avatar'
import logo from '@/public/images/logo.png'

import { LanguageSwitcher } from '../language-switcher'
import { Menu } from '../Menu'

import styles from './styles.module.sass'

interface AppHeaderProps {
    fullWidth?: boolean
    onMenuClick?: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({ fullWidth, onMenuClick }) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const authSlice = useAppSelector((state) => state.auth)

    // Track client-side mount to avoid hydration mismatches.
    // The auth query may immediately set isLoading=true on the client (when a
    // token exists in localStorage) before React finishes hydration, causing the
    // Button's className to differ from the SSR-rendered HTML.
    // We suppress that difference by treating isLoading as false until mounted.
    const [mounted, setMounted] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    const {
        data: meData,
        error,
        isLoading
    } = API.useAuthGetMeQuery(undefined, {
        skip: !authSlice?.token?.length || authSlice?.isAuth
    })

    const adminLinks = [
        {
            href: '/photos/form',
            label: t('components.common.app-layout.app-header.add-photo', 'Добавить фото')
        },
        {
            href: '/objects/form',
            label: t('components.common.app-layout.app-header.add-object', 'Добавить объект')
        },
        {
            href: '/stargazing/form',
            label: t('components.common.app-layout.app-header.add-stargazing', 'Добавить мероприятие')
        },
        {
            href: '/mailing',
            label: t('components.common.app-layout.app-header.mailings', 'Email рассылки')
        },
        {
            href: '/users',
            label: t('menu.users', 'Пользователи')
        }
    ]

    const handleLoginClick = () => {
        dispatch(openAuthDialog())
    }

    const handleLogout = () => {
        dispatch(logout())
    }

    useEffect(() => {
        setMounted(true)

        const handleScroll = () => setScrolled(window.scrollY > 10)

        window.addEventListener('scroll', handleScroll, { passive: true })

        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        if (meData?.auth === true) {
            dispatch(login(meData))
        } else if (meData?.auth === false) {
            dispatch(logout())
        }
    }, [meData, error])

    return (
        <header className={cn(styles.appHeader, scrolled && styles.scrolled)}>
            <div className={cn(fullWidth && styles.fullWidth, styles.wrapper)}>
                <Link
                    href={'/'}
                    title={t('components.common.app-layout.app-header.to-main-page', 'На главную')}
                    className={styles.logoLink}
                >
                    <Image
                        src={logo}
                        alt={''}
                        width={30}
                        height={30}
                    />
                </Link>

                <button
                    className={styles.hamburgerButton}
                    onClick={onMenuClick}
                    aria-label={'Toggle Sidebar'}
                >
                    <Icon name={'Menu'} />
                </button>

                <Menu className={styles.appMenu} />

                <div className={styles.rightSection}>
                    <LanguageSwitcher />

                    {!authSlice.isAuth && (
                        <Button
                            mode={'secondary'}
                            className={styles.loginButton}
                            onClick={handleLoginClick}
                            loading={mounted && isLoading}
                            label={
                                !(mounted && isLoading)
                                    ? t('components.common.app-layout.app-header.sign-in', 'Войти')
                                    : ''
                            }
                        />
                    )}

                    {authSlice?.isAuth && (
                        <Popout
                            trigger={
                                <UserAvatar
                                    size={'medium'}
                                    src={
                                        authSlice?.user?.avatar
                                            ? `${HOST_IMG}/users/${String(authSlice?.user.id)}/${String(authSlice?.user.avatar)}`
                                            : undefined
                                    }
                                    name={authSlice?.user?.name}
                                    className={styles.avatarImage}
                                />
                            }
                        >
                            <ul className={styles.contextListMenu}>
                                {authSlice?.user?.role === ApiModel.UserRole.ADMIN &&
                                    adminLinks.map((item) => (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                title={item.label}
                                            >
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}

                                {authSlice?.user?.role &&
                                    [
                                        ApiModel.UserRole.ADMIN,
                                        ApiModel.UserRole.MODERATOR,
                                        ApiModel.UserRole.SECURITY
                                    ].includes(authSlice?.user?.role) && (
                                        <li>
                                            <Link
                                                href={'/stargazing/checkin'}
                                                title={t(
                                                    'components.common.app-layout.app-header.qrcode-check',
                                                    'Проверка QR-кодов'
                                                )}
                                            >
                                                {t(
                                                    'components.common.app-layout.app-header.qrcode-check',
                                                    'Проверка QR-кодов'
                                                )}
                                            </Link>
                                        </li>
                                    )}

                                <li>
                                    <Link href={'/profile'}>{t('menu.profile', 'Личный кабинет')}</Link>
                                </li>

                                <li
                                    className={cn(
                                        authSlice?.user?.role !== ApiModel.UserRole.USER && styles.dividerItem
                                    )}
                                >
                                    <Link
                                        href={'/'}
                                        title={t('components.common.app-layout.app-header.logout', 'Выйти')}
                                        onClick={(event) => {
                                            event.preventDefault()
                                            handleLogout()
                                        }}
                                    >
                                        <Icon name={'Exit'} />
                                        {t('components.common.app-layout.app-header.logout', 'Выйти')}
                                    </Link>
                                </li>
                            </ul>
                        </Popout>
                    )}
                </div>
            </div>
        </header>
    )
}
