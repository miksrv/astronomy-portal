import React, { useEffect } from 'react'
import { Provider } from 'react-redux'
import dayjs from 'dayjs'

import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Script from 'next/script'
import { appWithTranslation, useTranslation } from 'next-i18next'

import { wrapper } from '@/api'
import { LOCAL_STORAGE } from '@/utils/constants'
import * as LocalStorage from '@/utils/localstorage'

import i18Config from '../next-i18next.config'

import 'dayjs/locale/ru'

import '@/styles/theme.css'
import '@/styles/globals.sass'

const App = ({ Component, pageProps }: AppProps) => {
    const router = useRouter()
    const { i18n } = useTranslation()
    const { store } = wrapper.useWrappedStore(pageProps)

    useEffect(() => {
        // Read the persisted locale preference on the client only.
        // LocalStorage.getItem returns '' on the server, so this effect
        // is intentionally client-only and safe to call on every language change.
        const storedLocale = LocalStorage.getItem(LOCAL_STORAGE.LOCALE as 'LOCALE')

        if (
            storedLocale &&
            i18n.language !== storedLocale &&
            i18Config.i18n.locales.includes(storedLocale) &&
            router.pathname !== '/404'
        ) {
            void router.replace(router.asPath, router.asPath, { locale: storedLocale })
        }
    }, [i18n.language, router])

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
            </Head>

            <Provider store={store}>
                <Component {...pageProps} />
            </Provider>

            {process.env.NODE_ENV === 'production' && (
                <>
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
