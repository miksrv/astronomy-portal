import React, { useEffect, useState } from 'react'
import Link from "next/link";

import { setCredentials } from '@/api/authSlice'
import { useAppDispatch } from '@/api/hooks'
import { useGetStatisticQuery, useLogoutMutation } from '@/api/api'

import LoginForm from '@/components/login-form/LoginForm'
import { show } from '@/components/login-form/loginFormSlice'
import { toggle } from '@/components/sidebar/sidebarSlice'

import styles from './header.module.sass'
import { UserAuth } from './userAuth'
import logo from '@/public/logo-w.svg'
import Image from "next/image";

type TMenuItems = {
    link: string
    name: string
    label?: 'photos' | 'objects'
}

export const MENU_ITEMS: TMenuItems[] = [
    { link: '/', name: 'Сводная' },
    { link: '/news', name: 'Новости' },
    { link: '/map', name: 'Карта' },
    { label: 'photos', link: '/photos', name: 'Фото' },
    { label: 'objects', link: '/objects', name: 'Объекты' },
    { link: '/dashboard', name: 'Телескоп' }
]

const Header: React.FC = () => {
    const dispatch = useAppDispatch()
    const currentMobile: boolean = typeof window !== "undefined" ? window.innerWidth <= 760 : false
    const { data, isSuccess } = useGetStatisticQuery()
    const [logout] = useLogoutMutation()
    const [auth, setAuth] = useState<boolean>(false)

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
        <div className={styles.menu}>
            <menu className={'container'}>
                <li className={styles.logo}>
                    <Image src={logo} alt={''} width={31} height={31} />
                </li>
                {MENU_ITEMS.map((item) => (
                    <li key={item.link}>
                        <Link href={item.link} title={item.name} className={styles.item}>{item.name}</Link>
                    </li>
                ))}
            </menu>
        </div>
    )

//     return (
//         <Menu
//             fixed='top'
//             color='grey'
//             className={styles.menu}
//             secondary
//             inverted
//         >
//             <Container>
//                 {!currentMobile && (
//                     <Menu.Item className={styles.logo}>
//                         <Image
//                             src={logo}
//                             alt=''
//                             width={30}
//                             height={30}
//                         />
//                     </Menu.Item>
//                 )}
//                 {currentMobile ? (
//                     <Menu.Item
//                         icon='bars'
//                         className={styles.hamburger}
//                         onClick={() => dispatch(toggle())}
//                     />
//                 ) : (
//                     MENU_ITEMS.map((item, key) => (
//                         <Menu.Item
//                             exact
//                             to={item.link}
//                             key={key}
//                         >
//                             {item.name}
//                             {item.label && (
//                                 <Label
//                                     color='green'
//                                     size='tiny'
//                                 >
//                                     {isSuccess ? data?.payload[item.label] : 0}
//                                 </Label>
//                             )}
//                         </Menu.Item>
//                     ))
//                 )}
//                 <Menu.Menu position='right'>
//                     {!auth ? (
//                         <Menu.Item
//                             name='Войти'
//                             onClick={() => dispatch(show())}
//                         />
//                     ) : (
//                         <Menu.Item
//                             name='Выйти'
//                             color='red'
//                             onClick={() => doLogout()}
//                         />
//                     )}
//                 </Menu.Menu>
//             </Container>
//             <LoginForm />
//         </Menu>
//     )
}

export default Header
