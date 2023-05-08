import { api, useAuthGetMeMutation, useStatisticGetQuery } from '@/api/api'
import {
    getStorageToken,
    logout,
    setToken,
    setUserAuth,
    setUserInfo
} from '@/api/authSlice'
import { useAppDispatch, useAppSelector } from '@/api/hooks'
import { APIResponseStatistic } from '@/api/types'
import { isMobile } from '@/functions/helpers'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import {
    Container,
    Dropdown,
    Icon,
    Label,
    Loader,
    Menu
} from 'semantic-ui-react'

import LoginForm from '@/components/login-form'
import { show } from '@/components/login-form/loginFormSlice'
import { toggle } from '@/components/sidebar/sidebarSlice'

import logo from '@/public/images/logo-w.svg'

import styles from './styles.module.sass'

export type TMenuItems = {
    link: string
    name: string
    label?: keyof APIResponseStatistic
}

export const menuItems: TMenuItems[] = [
    { link: '/blog', name: 'Блог' },
    { link: '/map', name: 'Карта' },
    { label: 'photos_count', link: '/photos', name: 'Фото' },
    { label: 'catalog_count', link: '/objects', name: 'Объекты' },
    { link: '/dashboard', name: 'Телескоп' }
]

const Header: React.FC = () => {
    const dispatch = useAppDispatch()
    const { data, isLoading } = useStatisticGetQuery()
    const [getAuthMe] = useAuthGetMeMutation()
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

    useEffect(() => {
        const storageToken = getStorageToken()

        if (storageToken && !auth.userToken) {
            dispatch(setToken(storageToken))
            handleAuthMe()
        }

        dispatch(api.endpoints.cronGetUpdatePosts.initiate())
    })

    return (
        <Menu
            fixed={'top'}
            color={'grey'}
            className={styles.menu}
            secondary
            inverted
        >
            <Container>
                {!isMobile && (
                    <Menu.Item>
                        <Link
                            href={'/'}
                            title={'Главная страница'}
                        >
                            <Image
                                src={logo}
                                alt={'Самодельная обсерватория'}
                                width={30}
                                height={30}
                            />
                        </Link>
                    </Menu.Item>
                )}
                {isMobile ? (
                    <Menu.Item
                        className={styles.hamburger}
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
                                    color={'yellow'}
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
                        <Dropdown
                            trigger={
                                <div>
                                    <Icon name='user' /> {auth.userInfo.name}
                                </div>
                            }
                            // text={auth.userInfo.name}
                            className={styles.dropdown}
                            item
                            simple
                        >
                            <Dropdown.Menu>
                                <Dropdown.Item
                                    text='Справочники'
                                    as={Link}
                                    href={'/directory'}
                                />
                                <Dropdown.Divider />
                                <Dropdown.Item
                                    text={'Выйти'}
                                    onClick={() => dispatch(logout())}
                                />
                            </Dropdown.Menu>
                        </Dropdown>
                        // <Menu.Item
                        //     name={'Выйти'}
                        //     color={'red'}
                        //     onClick={() => dispatch(logout())}
                        // />
                    )}
                </Menu.Menu>
            </Container>
            <LoginForm />
        </Menu>
    )
}

export default Header
