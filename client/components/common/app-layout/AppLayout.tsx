import React, { useEffect, useState } from 'react'
import { cn, Dialog } from 'simple-react-ui-kit'

import Head from 'next/head'
import { useTranslation } from 'next-i18next/pages'
import { generateNextSeo, NextSeoProps } from 'next-seo/pages'
import NextNProgress from 'nextjs-progressbar'

import { SITE_LINK, useAppDispatch, useAppSelector } from '@/api'
import { closeAuthDialog } from '@/api/applicationSlice'

import { LoginForm } from '../login-form'

import { AppHeader } from './app-header'
import { Menu } from './Menu'

import styles from './styles.module.sass'

interface AppLayoutProps extends Omit<NextSeoProps, 'children'> {
    fullWidth?: boolean
    noTopMargin?: boolean
    children?: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ fullWidth, noTopMargin, children, ...props }) => {
    const { t, i18n } = useTranslation()
    const dispatch = useAppDispatch()

    const showOverlay = useAppSelector((store) => store.application.showOverlay)
    const showAuthDialog = useAppSelector((store) => store.application.showAuthDialog)

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)

    const canonicalUrl = SITE_LINK + (i18n.language === 'en' ? 'en/' : '')
    const pageUrl = canonicalUrl + (props?.canonical ?? '')

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
            <Head>
                {generateNextSeo({
                    ...props,
                    canonical: props?.canonical !== undefined ? pageUrl : undefined,
                    languageAlternates:
                        props?.canonical !== undefined
                            ? [
                                  { hrefLang: 'ru', href: `${SITE_LINK}${props.canonical ?? ''}` },
                                  { hrefLang: 'en', href: `${SITE_LINK}en/${props.canonical ?? ''}` },
                                  { hrefLang: 'x-default', href: `${SITE_LINK}${props.canonical ?? ''}` }
                              ]
                            : undefined,
                    openGraph: {
                        url: props?.canonical !== undefined ? pageUrl : undefined,
                        type: 'website',
                        images: props?.openGraph?.images,
                        siteName: t('common.look-at-the-stars', 'Смотри на звёзды'),
                        locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                    },
                    twitter: {
                        cardType: 'summary_large_image',
                        ...props?.twitter
                    }
                })}
            </Head>

            <NextNProgress
                color={'#6f6ebb'}
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

            <main
                className={cn(styles.mainContainer, fullWidth && styles.fullWidth, noTopMargin && styles.noTopMargin)}
            >
                {children}
            </main>

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
