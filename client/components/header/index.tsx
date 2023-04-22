import { useGetAuthMeMutation, useGetStatisticQuery } from '@/api/api'
import {
    getStorageToken,
    logout,
    setToken,
    setUserAuth,
    setUserInfo
} from '@/api/authSlice'
import { useAppDispatch, useAppSelector } from '@/api/hooks'
import { APIResponseStatistic } from '@/api/types'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { Container, Label, Loader, Menu } from 'semantic-ui-react'

import LoginForm from '@/components/login-form'
import { hide, show } from '@/components/login-form/loginFormSlice'
import { toggle } from '@/components/sidebar/sidebarSlice'

import logo from '@/public/images/logo-w.svg'

import styles from './styles.module.sass'

// import { UserAuth } from './userAuth'

type TMenuItems = {
    link: string
    name: string
    label?: keyof APIResponseStatistic
}

export const menuItems: TMenuItems[] = [
    { link: '/', name: 'Сводка' },
    { link: '/news', name: 'Новости' },
    { link: '/map', name: 'Карта' },
    { label: 'photos_count', link: '/photos', name: 'Фото' },
    { label: 'catalog_count', link: '/objects', name: 'Объекты' },
    { link: '/dashboard', name: 'Телескоп' }
]

const Header: React.FC = () => {
    const dispatch = useAppDispatch()
    const currentMobile: boolean =
        typeof window !== 'undefined' ? window.innerWidth <= 760 : false
    const { data, isLoading } = useGetStatisticQuery()
    const [getAuthMe] = useGetAuthMeMutation()
    const router = useRouter()
    const auth = useAppSelector((state) => state.auth)

    const handleAuthMe = async () => {
        const result: any = await getAuthMe()

        if (!result?.data?.user?.email) {
            dispatch(logout())
        } else {
            dispatch(setUserInfo(result.data.user))
            dispatch(setUserAuth(true))
        }
    }

    React.useEffect(() => {
        const storageToken = getStorageToken()

        if (storageToken && !auth.userToken) {
            dispatch(setToken(storageToken))
            handleAuthMe()
        }
    }, [])

    return (
        <Menu
            fixed={'top'}
            color={'grey'}
            className={styles.menu}
            secondary
            inverted
        >
            <Container>
                {!currentMobile && (
                    <Menu.Item>
                        <Link
                            href={'/'}
                            title={'Главная страница'}
                        >
                            <Image
                                src={logo}
                                alt={'Логотип самодельной обсерватории'}
                                width={30}
                                height={30}
                            />
                        </Link>
                    </Menu.Item>
                )}
                {currentMobile ? (
                    <Menu.Item
                        as={Link}
                        icon={'bars'}
                        onClick={() => dispatch(toggle())}
                    />
                ) : (
                    menuItems.map((item, key) => (
                        <Menu.Item
                            as={Link}
                            href={item.link}
                            title={item.name}
                            active={router.pathname === item.link}
                            key={key}
                        >
                            {item.name}
                            {item.label && (
                                <Label
                                    className={styles.label}
                                    color={'green'}
                                    size={'tiny'}
                                >
                                    <Loader
                                        active={isLoading}
                                        size={'mini'}
                                    />
                                    {data?.[item.label]}
                                </Label>
                            )}
                        </Menu.Item>
                    ))
                )}
                <Menu.Menu position={'right'}>
                    {!auth.userInfo ? (
                        <Menu.Item
                            name={'Войти'}
                            onClick={() => dispatch(show())}
                        />
                    ) : (
                        <Menu.Item
                            name={'Выйти'}
                            color={'red'}
                            onClick={() => dispatch(logout())}
                        />
                    )}
                </Menu.Menu>
            </Container>
            <LoginForm />
        </Menu>
    )
}

export default Header
