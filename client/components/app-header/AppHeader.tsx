import { ApiType } from '@/api'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Icon, cn } from 'simple-react-ui-kit'

import { Menu } from '@/components/app-layout'

import logo from '@/public/images/logo-w.svg'

import styles from './styles.module.sass'

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

interface AppHeaderProps {
    fullWidth?: boolean
    onMenuClick?: () => void
}

const AppHeader: React.FC<AppHeaderProps> = ({ fullWidth, onMenuClick }) => {
    // const dispatch = useAppDispatch()

    // const [authGetMe, { data: meData, error }] = useAuthGetMeMutation()
    // const authSlice = useAppSelector((state) => state.auth)

    // useEffect(() => {
    //     if (meData?.auth) {
    //         dispatch(login(meData))
    //     } else {
    //         if (error) {
    //             dispatch(logout())
    //         }
    //     }
    // }, [meData, error])

    // useEffect(() => {
    //     if (authSlice.token) {
    //         authGetMe()
    //     }
    // }, [])

    return (
        <header className={styles.appHeader}>
            <div className={cn(fullWidth && styles.fullWidth, styles.wrapper)}>
                <Link
                    href={'/'}
                    title={'Главная страница'}
                    className={styles.logoLink}
                >
                    <Image
                        src={logo}
                        alt={'Самодельная обсерватория'}
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
            </div>
        </header>
    )
}

export default AppHeader
