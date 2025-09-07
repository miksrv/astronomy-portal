import React, { useEffect, useState } from 'react'
import { cn, Dialog } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next'
import { NextSeo } from 'next-seo'
import { NextSeoProps } from 'next-seo/lib/types'
import NextNProgress from 'nextjs-progressbar'

import { SITE_LINK, useAppDispatch, useAppSelector } from '@/api'
import { closeAuthDialog } from '@/api/applicationSlice'

import { LoginForm } from '../login-form'

import { AppHeader } from './app-header'
import { Menu } from './Menu'

import styles from './styles.module.sass'

interface AppLayoutProps extends Omit<NextSeoProps, 'children'> {
    fullWidth?: boolean
    children?: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ fullWidth, children, ...props }) => {
    const { t, i18n } = useTranslation()
    const dispatch = useAppDispatch()

    const { showOverlay, showAuthDialog } = useAppSelector((store) => store.application)

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')

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
            <NextSeo
                {...props}
                canonical={props?.canonical ? `${canonicalUrl}${props.canonical}` : undefined}
                openGraph={{
                    images: props?.openGraph?.images,
                    siteName: t('common.look-at-the-stars', 'Смотри на звёзды'),
                    locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                }}
            />

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
