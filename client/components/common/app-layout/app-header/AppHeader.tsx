import React, { useEffect, useState } from 'react'
import { Button, cn, Icon, Popout } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, HOST_IMG, useAppDispatch, useAppSelector } from '@/api'
import { openAuthDialog } from '@/api/applicationSlice'
import { logout } from '@/api/authSlice'
import { useAuthSession } from '@/api/useAuthSession'
import { UserAvatar } from '@/components/ui/user-avatar'
import logo from '@/public/images/logo.png'

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
    const userPermissions = authSlice?.user?.permissions ?? []

    // Track client-side mount to avoid hydration mismatches.
    // The auth query may immediately set isLoading=true on the client (when a
    // token exists in localStorage) before React finishes hydration, causing the
    // Button's className to differ from the SSR-rendered HTML.
    // We suppress that difference by treating isLoading as false until mounted.
    const [mounted, setMounted] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)

    // Also drives the actual token refresh (see useAuthSession) — AppHeader just
    // needs `isLoading` for the sign-in button spinner. RTK Query dedupes this
    // against the identical call made globally in AuthSessionSync (_app.tsx),
    // so this doesn't trigger an extra request.
    const { isLoading } = useAuthSession()

    const [logoutRequest] = API.useAuthLogoutMutation()

    // `permissions` lists which privilege unlocks each link — a link shows if
    // the user has any one of them.
    const adminLinks = [
        {
            href: '/photos/form',
            label: t('components.common.app-layout.app-header.add-photo', 'Добавить фото'),
            permissions: [ApiModel.Permission.PHOTOS_MANAGE]
        },
        {
            href: '/objects/form',
            label: t('components.common.app-layout.app-header.add-object', 'Добавить объект'),
            permissions: [ApiModel.Permission.OBJECTS_MANAGE]
        },
        {
            href: '/stargazing/form',
            label: t('components.common.app-layout.app-header.add-stargazing', 'Добавить мероприятие'),
            permissions: [ApiModel.Permission.EVENTS_CREATE, ApiModel.Permission.EVENTS_UPDATE]
        },
        {
            href: '/admin/mailing',
            label: t('components.common.app-layout.app-header.mailings', 'Email рассылки'),
            permissions: [ApiModel.Permission.MAILINGS_MANAGE]
        },
        {
            href: '/admin/push-notifications',
            label: t('components.common.app-layout.app-header.push-notifications', 'Push-уведомления'),
            permissions: [ApiModel.Permission.PUSH_MANAGE]
        },
        {
            href: '/admin/users',
            label: t('menu.users', 'Пользователи'),
            permissions: [ApiModel.Permission.USERS_MANAGE]
        },
        {
            href: '/admin/roles',
            label: t('menu.roles', 'Роли'),
            permissions: [ApiModel.Permission.USERS_MANAGE]
        }
    ]

    const handleLoginClick = () => {
        dispatch(openAuthDialog())
    }

    const handleLogout = () => {
        void logoutRequest()
        dispatch(logout())
    }

    useEffect(() => {
        setMounted(true)

        const handleScroll = () => setScrolled(window.scrollY > 10)

        window.addEventListener('scroll', handleScroll, { passive: true })

        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

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
                            onOpenChange={setUserMenuOpen}
                            trigger={
                                <span className={styles.userMenuTrigger}>
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
                                    <Icon
                                        name={userMenuOpen ? 'KeyboardUp' : 'KeyboardDown'}
                                        className={styles.arrow}
                                    />
                                </span>
                            }
                        >
                            <ul className={styles.contextListMenu}>
                                {adminLinks
                                    .filter((item) => item.permissions.some((p) => userPermissions.includes(p)))
                                    .map((item) => (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                title={item.label}
                                            >
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}

                                {userPermissions.includes(ApiModel.Permission.EVENTS_CHECKIN) && (
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

                                <li className={cn(userPermissions.length > 0 && styles.dividerItem)}>
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
