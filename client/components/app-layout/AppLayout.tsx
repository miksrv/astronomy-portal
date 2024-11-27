import { useAppSelector } from '@/api/store'
import NextNProgress from 'nextjs-progressbar'
import React, { useEffect, useState } from 'react'
import { cn } from 'simple-react-ui-kit'

import AppHeader from '@/components/app-header'

import { Menu } from './Menu'
import styles from './styles.module.sass'

interface AppLayoutProps {
    fullWidth?: boolean
    children?: React.ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ fullWidth, children }) => {
    const application = useAppSelector((store) => store.application)

    const [overlayHeight, setOverlayHeight] = useState<number | string>('100%')
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)

    const handleCloseOverlay = () => {
        setSidebarOpen(false)
    }

    const handleOpenSideBar = () => {
        setSidebarOpen(true)
    }

    useEffect(() => {
        if (application.showOverlay || sidebarOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'auto'
        }

        return () => {
            document.body.style.overflow = 'auto'
        }
    }, [application.showOverlay, sidebarOpen])

    useEffect(() => {
        const calculatePageHeight = () => {
            if (document.documentElement.scrollHeight) {
                setOverlayHeight(document.documentElement.clientHeight)
            }
        }

        calculatePageHeight()

        window.addEventListener('resize', calculatePageHeight)

        return () => {
            window.removeEventListener('resize', calculatePageHeight)
        }
    }, [])

    return (
        <div className={styles.appLayout}>
            <NextNProgress
                color={'#fbbd08'}
                options={{ showSpinner: false }}
            />

            <div
                role={'button'}
                tabIndex={0}
                // style={{ height: overlayHeight }}
                style={{ height: '100%' }}
                className={cn(
                    styles.overlay,
                    application.showOverlay || sidebarOpen
                        ? styles.displayed
                        : styles.hidden
                )}
                onKeyDown={handleCloseOverlay}
                onClick={handleCloseOverlay}
            />

            <AppHeader
                fullWidth={fullWidth}
                onMenuClick={handleOpenSideBar}
            />

            <aside
                className={cn(
                    styles.sidebar,
                    sidebarOpen ? styles.opened : styles.closed
                )}
            >
                <Menu onClick={handleCloseOverlay} />
            </aside>

            <main
                className={cn(
                    styles.mainContainer,
                    fullWidth && styles.fullWidth
                )}
            >
                {children}
            </main>
        </div>
    )
}

export default AppLayout
