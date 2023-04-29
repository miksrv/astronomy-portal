import { useStatisticGetQuery } from '@/api/api'
import { useAppDispatch, useAppSelector } from '@/api/hooks'
import Link from 'next/link'
import React from 'react'
import { Label, Loader, Menu, Sidebar as SidebarMenu } from 'semantic-ui-react'

import { menuItems } from '@/components/header'
import { hide } from '@/components/sidebar/sidebarSlice'

// import styles from './styles.module.sass'

const Sidebar: React.FC = () => {
    const dispatch = useAppDispatch()
    const visible = useAppSelector((state) => state.sidebar.visible)
    const { data, isLoading } = useStatisticGetQuery()

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
                    as={Link}
                    onClick={() => dispatch(hide())}
                    href={item.link}
                    key={key}
                >
                    {item.name}
                    {item.label && (
                        <Label
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
