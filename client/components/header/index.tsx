import { useGetStatisticQuery, useLogoutMutation } from '@/api/api'
import { setCredentials } from '@/api/authSlice'
import { useAppDispatch } from '@/api/hooks'
import { APIResponseStatistic } from '@/api/types'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { Container, Label, Loader, Menu } from 'semantic-ui-react'

import LoginForm from '@/components/login-form'
import { show } from '@/components/login-form/loginFormSlice'
import { toggle } from '@/components/sidebar/sidebarSlice'

import logo from '@/public/images/logo-w.svg'

import styles from './styles.module.sass'
import { UserAuth } from './userAuth'

type TMenuItems = {
    link: string
    name: string
    label?: keyof APIResponseStatistic
}

export const MENU_ITEMS: TMenuItems[] = [
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
    const [logout] = useLogoutMutation()
    const [auth, setAuth] = useState<boolean>(false)
    const router = useRouter()

    const user = UserAuth()

    const doLogout = async () => {
        try {
            const user = await logout().unwrap()
            dispatch(setCredentials(user))
            setAuth(user.status)
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        setAuth(user.status)
    }, [user])

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
                    MENU_ITEMS.map((item, key) => (
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
                    {!auth ? (
                        <Menu.Item
                            name={'Войти'}
                            onClick={() => dispatch(show())}
                        />
                    ) : (
                        <Menu.Item
                            name={'Выйти'}
                            color={'red'}
                            onClick={() => doLogout()}
                        />
                    )}
                </Menu.Menu>
            </Container>
            <LoginForm />
        </Menu>
    )
}

export default Header
