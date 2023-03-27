import React, { useEffect, useState } from 'react'
import { Container, Label, Menu } from 'semantic-ui-react'

import { setCredentials } from '@/api/authSlice'
import { useAppDispatch } from '@/api/hooks'
import { MENU_ITEMS } from '@/api/menu'
import { useGetStatisticQuery, useLogoutMutation } from '@/api/api'

import LoginForm from '@/components/login-form/LoginForm'
import { show } from '@/components/login-form/loginFormSlice'
import { toggle } from '@/components/sidebar/sidebarSlice'

import styles from './header.module.sass'
import { UserAuth } from './userAuth'
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
        <Menu
            fixed='top'
            color='grey'
            className={styles.menu}
            secondary
            inverted
        >
            <Container>
                {!currentMobile && (
                    <Menu.Item className={styles.logo}>
                        <img
                            src='/logo-w.svg'
                            alt=''
                        />
                    </Menu.Item>
                )}
                {currentMobile ? (
                    <Menu.Item
                        icon='bars'
                        className={styles.hamburger}
                        onClick={() => dispatch(toggle())}
                    />
                ) : (
                    MENU_ITEMS.map((item, key) => (
                        <Menu.Item
                            exact
                            to={item.link}
                            key={key}
                        >
                            {item.name}
                            {item.label && (
                                <Label
                                    color='green'
                                    size='tiny'
                                >
                                    {isSuccess ? data?.payload[item.label] : 0}
                                </Label>
                            )}
                        </Menu.Item>
                    ))
                )}
                <Menu.Menu position='right'>
                    {!auth ? (
                        <Menu.Item
                            name='Войти'
                            onClick={() => dispatch(show())}
                        />
                    ) : (
                        <Menu.Item
                            name='Выйти'
                            color='red'
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
