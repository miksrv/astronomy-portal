import React, { useEffect } from 'react'
import { Provider } from 'react-redux'
import dayjs from 'dayjs'

import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Script from 'next/script'
import { appWithTranslation, useTranslation } from 'next-i18next/pages'

import { SITE_LINK, wrapper } from '@/api'
import { useAuthSession } from '@/api/useAuthSession'
import { usePushClaim } from '@/api/usePushClaim'
import { PushSubscribeBanner } from '@/components/common'

import i18Config from '../next-i18next.config'

import 'dayjs/locale/ru'

import 'leaflet/dist/leaflet.css'
import '@/styles/theme.css'
import '@/styles/globals.sass'

// Refreshes the auth token on every fresh page load (see useAuthSession for
// why). Rendered as its own component so the hook runs inside <Provider>,
// unconditionally on every route — not only on pages whose layout happens
// to mount AppHeader.
const AuthSessionSync = () => {
    useAuthSession()
    return null
}

// Claims any pre-existing browser push subscription for the account right
// after login/registration (see usePushClaim). Same rationale as
// AuthSessionSync — must run on every route, not just ones whose layout
// happens to mount something push-related.
const PushClaimSync = () => {
    usePushClaim()
    return null
}

const App = ({ Component, pageProps }: AppProps) => {
    const { i18n } = useTranslation()
    const { store } = wrapper.useWrappedStore(pageProps)
    const { pathname } = useRouter()

    // Mounted here (not inside AppLayout) deliberately: every page wraps
    // itself in its own <AppLayout> instance (see AppLayoutProps usage
    // across pages/), so navigating between two /stargazing pages swaps
    // `Component` and unmounts/remounts the whole AppLayout tree - which
    // would reset the banner's dismissed/subscribed state and its entrance
    // delay on every in-section navigation. This component tree, unlike
    // AppLayout, persists across route changes (only `Component` changes),
    // so the same <PushSubscribeBanner> instance survives navigating
    // between /stargazing pages and only unmounts once the visitor leaves
    // the section entirely.
    const isStargazingSection = pathname === '/stargazing' || pathname.startsWith('/stargazing/')

    // dayjs.locale() mutates a global singleton and must not be called during
    // the render phase — doing so can trigger "Cannot update a component while
    // rendering a different component" when next-redux-wrapper dispatches HYDRATE
    // synchronously and RTK Query subscribers (e.g. AppHeader) receive a state
    // update mid-render. Moving it into useEffect defers the mutation until after
    // the render is committed.
    useEffect(() => {
        dayjs.locale(i18n.language ?? i18Config.i18n.defaultLocale)
    }, [i18n.language])

    return (
        <>
            <Script
                src='/scripts/d3.min.js'
                strategy='beforeInteractive'
            />
            <Script
                src='/scripts/d3.geo.projection.min.js'
                strategy='beforeInteractive'
            />
            <Script
                src='/scripts/celestial.min.js'
                strategy='beforeInteractive'
            />

            <Head>
                <meta
                    name={'mobile-web-app-capable'}
                    content={'yes'}
                />
                <meta
                    name={'viewport'}
                    content={'width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no'}
                />
                <meta
                    name={'apple-mobile-web-app-status-bar-style'}
                    content={'black-translucent'}
                />
                <meta
                    name={'theme-color'}
                    content={'#1b1b1b'}
                    media={'(prefers-color-scheme: dark)'}
                />
                <link
                    rel={'apple-touch-icon'}
                    sizes={'180x180'}
                    href={'/apple-touch-icon.png'}
                />
                <link
                    rel={'icon'}
                    type={'image/png'}
                    sizes={'32x32'}
                    href={'/favicon-32x32.png'}
                />
                <link
                    rel={'icon'}
                    type={'image/png'}
                    sizes={'16x16'}
                    href={'/favicon-16x16.png'}
                />
                <link
                    rel={'icon'}
                    href={'/favicon.ico'}
                    type={'image/x-icon'}
                />
                <link
                    rel={'manifest'}
                    href={'/site.webmanifest'}
                />
                <script
                    type={'application/ld+json'}
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'Organization',
                            name: 'Смотри на звёзды',
                            url: SITE_LINK?.replace(/\/$/, ''),
                            logo: `${SITE_LINK}android-chrome-192x192.png`,
                            sameAs: ['https://t.me/look_at_stars']
                        })
                    }}
                />
            </Head>

            <Provider store={store}>
                <AuthSessionSync />
                <PushClaimSync />
                {isStargazingSection && <PushSubscribeBanner />}
                <Component {...pageProps} />
            </Provider>

            {process.env.NODE_ENV === 'production' && (
                <>
                    {/* Google tag (gtag.js) */}
                    <Script
                        src={'https://www.googletagmanager.com/gtag/js?id=G-BGBKSHELMF'}
                        strategy={'afterInteractive'}
                    />
                    <Script
                        id={'google-analytics'}
                        strategy={'afterInteractive'}
                    >
                        {`
                            window.dataLayer = window.dataLayer || [];
                            function gtag(){dataLayer.push(arguments);}
                            gtag('js', new Date());

                            gtag('config', 'G-BGBKSHELMF');
                        `}
                    </Script>

                    {/* Yandex.Metrika counter */}
                    <Script
                        id={'yandex-metrika'}
                        strategy={'afterInteractive'}
                    >
                        {`
                            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                            m[i].l=1*new Date();
                            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
                            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

                            ym(93471741, "init", {
                                clickmap:true,
                                referrer: document.referrer,
                                url: location.href,
                                accurateTrackBounce:true,
                                trackLinks:true
                            });
                        `}
                    </Script>
                    <noscript>
                        <div>
                            <img
                                src={'https://mc.yandex.ru/watch/93471741'}
                                style={{ position: 'absolute', left: '-9999px' }}
                                alt={''}
                            />
                        </div>
                    </noscript>
                </>
            )}
        </>
    )
}

// Pass i18Config as the second argument so appWithTranslation has a config
// fallback for pages that do not call serverSideTranslations (e.g. /404).
// Without this, those pages render without an I18nextProvider and
// react-i18next emits a "NO_I18NEXT_INSTANCE" warning during build.
export default appWithTranslation(App, i18Config)
