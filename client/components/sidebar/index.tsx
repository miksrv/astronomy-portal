import { useGetStatisticQuery } from '@/api/api'
import { useAppDispatch, useAppSelector } from '@/api/hooks'
import React from 'react'
import { Label, Loader, Menu, Sidebar as SidebarMenu } from 'semantic-ui-react'

import { menuItems } from '@/components/header'
import { hide } from '@/components/sidebar/sidebarSlice'

// import styles from './styles.module.sass'

const Sidebar: React.FC = () => {
    const dispatch = useAppDispatch()
    const visible = useAppSelector((state) => state.sidebar.visible)
    const { data, isLoading } = useGetStatisticQuery()

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
            {menuItems.map((item, key) => (
                <Menu.Item
                    onClick={() => dispatch(hide())}
                    exact
                    to={item.link}
                    key={key}
                >
                    {item.name}
                    {item.label && (
                        <Label
                            // className={styles.label}
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
            ))}
        </SidebarMenu>
    )
}

export default Sidebar
