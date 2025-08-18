import React, { useEffect, useState } from 'react'
import { cn, Dialog } from 'simple-react-ui-kit'

import NextNProgress from 'nextjs-progressbar'

import { useAppDispatch, useAppSelector } from '@/api'
import { closeAuthDialog } from '@/api/applicationSlice'

import { LoginForm } from '../login-form'

import { AppHeader } from './app-header'
import { Menu } from './Menu'

import styles from './styles.module.sass'

interface AppLayoutProps {
    fullWidth?: boolean
    children?: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ fullWidth, children }) => {
    const dispatch = useAppDispatch()

    const { showOverlay, showAuthDialog } = useAppSelector((store) => store.application)

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)

    const handleCloseOverlay = () => {
        setSidebarOpen(false)
    }

    const handleOpenSideBar = () => {
        setSidebarOpen(true)
    }

    const handleCloseAuthDialog = () => {
        dispatch(closeAuthDialog())
    }

    useEffect(() => {
        if (showOverlay || sidebarOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'auto'
        }

        return () => {
            document.body.style.overflow = 'auto'
        }
    }, [showOverlay, sidebarOpen])

    return (
        <div className={styles.appLayout}>
            <NextNProgress
                color={'#fbbd08'}
                options={{ showSpinner: false }}
            />

            <div
                role={'button'}
                tabIndex={0}
                className={cn(styles.overlay, showOverlay || sidebarOpen ? styles.displayed : styles.hidden)}
                onKeyDown={handleCloseOverlay}
                onClick={handleCloseOverlay}
            />

            <AppHeader
                fullWidth={fullWidth}
                onMenuClick={handleOpenSideBar}
            />

            <aside className={cn(styles.sidebar, sidebarOpen ? styles.opened : styles.closed)}>
                <Menu
                    sidebarMenu={true}
                    onClick={handleCloseOverlay}
                />
            </aside>

            <main className={cn(styles.mainContainer, fullWidth && styles.fullWidth)}>{children}</main>

            <Dialog
                open={showAuthDialog}
                onCloseDialog={handleCloseAuthDialog}
                maxWidth={'400px'}
            >
                <LoginForm
                    onError={(error) => {
                        if (error?.status === 403) {
                            handleCloseAuthDialog()
                        }
                    }}
                />
            </Dialog>
        </div>
    )
}
