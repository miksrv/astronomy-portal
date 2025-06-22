import React, { useEffect } from 'react'
import { Button, cn, Icon, Popout } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { API, HOST_IMG, useAppDispatch, useAppSelector } from '@/api'
import { openAuthDialog } from '@/api/applicationSlice'
import { login, logout } from '@/api/authSlice'
import { Menu } from '@/components/app-layout'
import LanguageSwitcher from '@/components/language-switcher'
import logo from '@/public/images/logo.png'
import defaultAvatar from '@/public/images/no-avatar.png'

import styles from './styles.module.sass'

interface AppHeaderProps {
    fullWidth?: boolean
    onMenuClick?: () => void
}

const AppHeader: React.FC<AppHeaderProps> = ({ fullWidth, onMenuClick }) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const authSlice = useAppSelector((state) => state.auth)

    const [authGetMe, { data: meData, error, isLoading }] = API.useAuthGetMeMutation()

    const handleLoginClick = () => {
        dispatch(openAuthDialog())
    }

    const handleLogout = () => {
        dispatch(logout())
    }

    useEffect(() => {
        if (meData?.auth === true) {
            dispatch(login(meData))
        } else if (meData?.auth === false) {
            dispatch(logout())
        }
    }, [meData, error])

    useEffect(() => {
        if (!authSlice?.isAuth && authSlice?.token?.length) {
            void authGetMe()
        }
    }, [])

    return (
        <header className={styles.appHeader}>
            <div className={cn(fullWidth && styles.fullWidth, styles.wrapper)}>
                <Link
                    href={'/'}
                    title={t('main-page')}
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
                            loading={isLoading}
                            label={!isLoading ? t('sign-in') : ''}
                        />
                    )}

                    {authSlice?.isAuth && (
                        <Popout
                            trigger={
                                <Image
                                    alt={''}
                                    className={styles.avatarImage}
                                    src={
                                        authSlice?.user
                                            ? `${HOST_IMG}/users/${authSlice?.user.id}/${authSlice?.user.avatar}`
                                            : defaultAvatar.src
                                    }
                                    width={32}
                                    height={32}
                                />
                            }
                        >
                            <ul className={styles.contextListMenu}>
                                <li>
                                    <Link
                                        href={'/'}
                                        title={t('logout')}
                                        onClick={(event) => {
                                            event.preventDefault()
                                            handleLogout()
                                        }}
                                    >
                                        <Icon name={'Exit'} />
                                        {t('logout')}
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

export default AppHeader
