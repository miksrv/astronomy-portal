import { ApiType, useAppDispatch, useAppSelector } from '@/api'
import { useAuthGetMeMutation, useStatisticGetQuery } from '@/api/api'
import { openFormCatalog, openFormPhoto } from '@/api/applicationSlice'
import { login, logout } from '@/api/authSlice'
import dynamic from 'next/dynamic'
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

import { show } from '@/components/login-modal/loginModalSlice'
import { toggle } from '@/components/sidebar/sidebarSlice'

import logo from '@/public/images/logo-w.svg'

import styles from './styles.module.sass'

const ObjectFormModal = dynamic(
    () => import('@/components/object-form-modal'),
    {
        ssr: false
    }
)

const PhotoFormModal = dynamic(() => import('@/components/photo-form-modal'), {
    ssr: false
})

const LoginModal = dynamic(() => import('@/components/login-modal'), {
    ssr: false
})

export type MenuItemsType = {
    link: string
    name: string
    label?: keyof ApiType.Statistic.ResGeneral
    external?: boolean
}

export const menuItems: MenuItemsType[] = [
    { external: true, link: 'https://t.me/nearspace', name: 'Блог' },
    { link: '/celestial', name: 'Карта' },
    { label: 'photos', link: '/photos', name: 'Фото' },
    { label: 'objects', link: '/objects', name: 'Объекты' },
    { link: '/dashboard', name: 'Обсерватория' },
    { link: '/stargazing', name: 'Астровыезд' },
    { link: '/about', name: 'О проекте' }
]

const Header: React.FC = () => {
    const dispatch = useAppDispatch()
    const router = useRouter()

    const { data, isLoading } = useStatisticGetQuery()
    const [authGetMe, { data: meData, error }] = useAuthGetMeMutation()
    const authSlice = useAppSelector((state) => state.auth)

    useEffect(() => {
        if (meData?.auth) {
            dispatch(login(meData))
        } else {
            if (error) {
                dispatch(logout())
            }
        }
    }, [meData, error])

    useEffect(() => {
        if (authSlice.token) {
            authGetMe()
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
                <Menu.Item className={styles.logoLink}>
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
                <Menu.Item
                    className={styles.hamburger}
                    icon={'bars'}
                    onClick={() => dispatch(toggle())}
                />
                {menuItems.map((item) => (
                    <Menu.Item
                        key={item.name}
                        as={Link}
                        href={item.link}
                        title={item.name}
                        active={router.pathname === item.link}
                        target={item.external ? '_blank' : undefined}
                        className={styles.desktopMenu}
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
                ))}
                <Menu.Menu position={'right'}>
                    {!authSlice.isAuth ? (
                        <Menu.Item
                            name={'Войти'}
                            onClick={() => dispatch(show())}
                        />
                    ) : (
                        <Dropdown
                            trigger={
                                <>
                                    <Icon name='user' /> {authSlice?.user?.name}
                                </>
                            }
                            item
                        >
                            <Dropdown.Menu>
                                <Dropdown.Item
                                    icon={'book'}
                                    text='Справочники'
                                    as={Link}
                                    href={'/directory'}
                                />
                                {authSlice?.user?.role === 'admin' && (
                                    <>
                                        <Dropdown.Divider />
                                        <Dropdown.Item
                                            icon={'plus'}
                                            content='Добавить объект'
                                            onClick={() =>
                                                dispatch(openFormCatalog(true))
                                            }
                                        />
                                        <Dropdown.Item
                                            icon={'upload'}
                                            content='Добавить астрофото'
                                            onClick={() =>
                                                dispatch(openFormPhoto(true))
                                            }
                                        />
                                    </>
                                )}
                                <Dropdown.Divider />
                                <Dropdown.Item
                                    text={'Выйти'}
                                    onClick={() => dispatch(logout())}
                                />
                            </Dropdown.Menu>
                        </Dropdown>
                    )}
                </Menu.Menu>
            </Container>
            {!authSlice.isAuth && <LoginModal />}
            {authSlice.isAuth && authSlice?.user?.role === 'admin' && (
                <ObjectFormModal />
            )}
            {authSlice.isAuth && authSlice?.user?.role === 'admin' && (
                <PhotoFormModal />
            )}
        </Menu>
    )
}

export default Header
