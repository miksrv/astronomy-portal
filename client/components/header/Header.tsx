import {
    useAuthGetMeMutation,
    useCronGetUpdatePostsQuery,
    useStatisticGetQuery
} from '@/api/api'
import { openFormCatalog, openFormPhoto } from '@/api/applicationSlice'
import { login, logout } from '@/api/authSlice'
import { useAppDispatch, useAppSelector } from '@/api/hooks'
import { APIResponseStatistic } from '@/api/types'
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

import { show } from '@/components/login-form/loginFormSlice'
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

const LoginForm = dynamic(() => import('@/components/login-form'), {
    ssr: false
})

export type TMenuItems = {
    link: string
    name: string
    label?: keyof APIResponseStatistic
}

export const menuItems: TMenuItems[] = [
    { link: '/blog', name: 'Блог' },
    { link: '/celestial', name: 'Карта' },
    { label: 'photos', link: '/photos', name: 'Фото' },
    { label: 'objects', link: '/objects', name: 'Объекты' },
    { link: '/dashboard', name: 'Телеметрия' },
    { link: '/about', name: 'О проекте' }
]

const Header: React.FC = () => {
    const dispatch = useAppDispatch()
    const router = useRouter()

    const { data, isLoading } = useStatisticGetQuery()
    const { isLoading: isCronLoading } = useCronGetUpdatePostsQuery()
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
                                    active={isLoading || isCronLoading}
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
            {!authSlice.isAuth && <LoginForm />}
            {authSlice.isAuth && <ObjectFormModal />}
            {authSlice.isAuth && <PhotoFormModal />}
        </Menu>
    )
}

export default Header
