import React, { useCallback, useEffect, useRef, useState } from 'react'
import { cn, Dialog } from 'simple-react-ui-kit'

import dynamic from 'next/dynamic'
import Head from 'next/head'
import { useTranslation } from 'next-i18next/pages'
import { generateNextSeo, NextSeoProps } from 'next-seo/pages'
import NextNProgress from 'nextjs-progressbar'

import { SITE_LINK, useAppDispatch, useAppSelector } from '@/api'
import { closeAuthDialog } from '@/api/applicationSlice'
import { createPageUrl } from '@/utils/helpers'

import { CookieConsent } from '../cookie-consent'
import { SnackbarStack } from '../snackbar-stack'

import { AppHeader } from './app-header'
import { Menu } from './Menu'

import styles from './styles.module.sass'

// The auth dialog (and its form validation libraries) is opened by a minority of
// visitors, so it's fetched on first open instead of shipping with every page.
const LoginForm = dynamic(() => import('../login-form').then((module) => module.LoginForm), { ssr: false })

export interface AppLayoutProps extends Omit<NextSeoProps, 'children' | 'titleTemplate'> {
    fullWidth?: boolean
    noTopMargin?: boolean
    /** Use `title` as the whole <title>, without the " — Смотри на звёзды" brand suffix (the home page) */
    noBrandSuffix?: boolean
    children?: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ fullWidth, noTopMargin, noBrandSuffix, children, ...props }) => {
    const { t, i18n } = useTranslation()
    const dispatch = useAppDispatch()

    const siteName = t('common.look-at-the-stars', 'Смотри на звёзды')

    // The brand suffix is composed here rather than with next-seo's `titleTemplate`: that one
    // is stored in a module-level variable, so on the server it would leak into every later
    // render of every page
    const documentTitle = props.title && !noBrandSuffix ? `${props.title} — ${siteName}` : props.title

    const showOverlay = useAppSelector((store) => store.application.showOverlay)
    const showAuthDialog = useAppSelector((store) => store.application.showAuthDialog)

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)

    const pageUrl = createPageUrl(i18n.language, props?.canonical ?? '')

    const sidebarRef = useRef<HTMLElement>(null)
    const returnFocusRef = useRef<HTMLElement | null>(null)

    const handleCloseOverlay = useCallback(() => {
        setSidebarOpen(false)
    }, [])

    const handleOpenSideBar = () => {
        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
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

    // Sidebar as a modal menu: focus moves into it, Escape closes it, and focus
    // goes back to the button that opened it
    useEffect(() => {
        if (!sidebarOpen) {
            return
        }

        sidebarRef.current?.focus()

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleCloseOverlay()
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            returnFocusRef.current?.focus()
        }
    }, [sidebarOpen, handleCloseOverlay])

    return (
        <div className={styles.appLayout}>
            <Head>
                {generateNextSeo({
                    ...props,
                    title: documentTitle,
                    // Lets search engines show the astrophotos as large previews (Google Discover,
                    // image-rich results) instead of thumbnails
                    robotsProps: { maxImagePreview: 'large', ...props?.robotsProps },
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
                        // Social cards already show the site name, so they get the bare title
                        title: props?.openGraph?.title ?? props.title,
                        description: props?.openGraph?.description ?? props.description,
                        type: props?.openGraph?.type ?? 'website',
                        images: props?.openGraph?.images?.map((image) => ({
                            ...image,
                            url: image.url.startsWith('http')
                                ? image.url
                                : `${SITE_LINK}${image.url.replace(/^\//, '')}`
                        })),
                        siteName,
                        locale: i18n.language === 'ru' ? 'ru_RU' : 'en_US'
                    },
                    twitter: {
                        cardType: 'summary_large_image',
                        ...props?.twitter
                    }
                })}
            </Head>

            {/* showOnShallow=false: a shallow route change never hits the server, so the bar
                would be pure noise. It also silences the flicker on pages that mirror their
                client-side state into the URL - the star map writes a permalink on every
                pan/zoom/setting change (usePermalinkSync), and the objects/photos/admin-users
                filters do the same on every keystroke. */}
            <NextNProgress
                color={'#8d8cf0'} // --color-main
                showOnShallow={false}
                options={{ showSpinner: false }}
            />

            <div
                aria-hidden={'true'}
                className={cn(styles.overlay, showOverlay || sidebarOpen ? styles.displayed : styles.hidden)}
                onClick={handleCloseOverlay}
            />

            <AppHeader
                fullWidth={fullWidth}
                menuOpen={sidebarOpen}
                onMenuClick={handleOpenSideBar}
            />

            <aside
                ref={sidebarRef}
                id={'app-sidebar'}
                tabIndex={-1}
                aria-label={t('components.common.app-layout.app-header.menu', 'Меню')}
                className={cn(styles.sidebar, sidebarOpen && styles.opened)}
            >
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

            <CookieConsent />

            <SnackbarStack />
        </div>
    )
}
