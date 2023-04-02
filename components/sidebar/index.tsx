import { useGetStatisticQuery } from '@/api/api'
import { useAppDispatch, useAppSelector } from '@/api/hooks'
import React from 'react'
import { Label, Menu, Sidebar as SidebarMenu } from 'semantic-ui-react'

import { MENU_ITEMS } from '@/components/header'
import { hide } from '@/components/sidebar/sidebarSlice'

import styles from './styles.module.sass'

const Sidebar: React.FC = () => {
    const dispatch = useAppDispatch()
    const visible = useAppSelector((state) => state.sidebar.visible)
    const { data, isSuccess } = useGetStatisticQuery()

    return (
        <SidebarMenu
            as={Menu}
            animation={'overlay'}
            icon={'labeled'}
            inverted
            onHide={() => dispatch(hide())}
            vertical
            visible={visible}
            width={'thin'}
        >
            {MENU_ITEMS.map((item, key) => (
                <Menu.Item
                    onClick={() => dispatch(hide())}
                    exact
                    to={item.link}
                    key={key}
                >
                    {item.name}
                    {item.label && (
                        <Label
                            color={'green'}
                            size={'tiny'}
                        >
                            {isSuccess ? data?.payload[item.label] : 0}
                        </Label>
                    )}
                </Menu.Item>
            ))}
        </SidebarMenu>
    )
}

export default Sidebar
