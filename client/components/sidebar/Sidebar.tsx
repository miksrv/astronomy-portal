import { API, useAppDispatch, useAppSelector } from '@/api'
import Link from 'next/link'
import React from 'react'
import { Label, Loader, Menu, Sidebar as SidebarMenu } from 'semantic-ui-react'

import { MenuItemsType, menuItems } from '@/components/header/Header'
import { hide } from '@/components/sidebar/sidebarSlice'

import styles from './styles.module.sass'

const Sidebar: React.FC = () => {
    const dispatch = useAppDispatch()
    const visible = useAppSelector((state) => state.sidebar.visible)
    const { data, isLoading } = API.useStatisticGetQuery()

    const beforeMobileMenu: MenuItemsType[] = [{ link: '/', name: 'Главная' }]
    const afterMobileMenu: MenuItemsType[] = [
        { link: '/directory', name: 'Справочники' }
    ]

    return (
        <SidebarMenu
            as={Menu}
            className={styles.sidebar}
            animation={'overlay'}
            icon={'labeled'}
            inverted
            onHide={() => dispatch(hide())}
            vertical
            visible={visible}
            width={'thin'}
        >
            {[...beforeMobileMenu, ...menuItems, ...afterMobileMenu].map(
                (item) => (
                    <Menu.Item
                        key={item.link}
                        as={Link}
                        onClick={() => dispatch(hide())}
                        href={item.link}
                        title={item.name}
                        className={styles.item}
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
                )
            )}
        </SidebarMenu>
    )
}

export default Sidebar
