import React from 'react'

import { Head, Html, Main, NextScript } from 'next/document'

const API_ORIGIN = process.env.NEXT_PUBLIC_API_HOST?.replace(/\/$/, '')

export default function Document() {
    return (
        <Html data-theme={'dark'}>
            <Head>
                {/* Every photo and cover is fetched from the API host: open the connection early */}
                {API_ORIGIN && (
                    <link
                        rel={'preconnect'}
                        href={API_ORIGIN}
                    />
                )}
                <link
                    rel={'dns-prefetch'}
                    href={'https://mc.yandex.ru'}
                />
                <link
                    rel={'dns-prefetch'}
                    href={'https://www.googletagmanager.com'}
                />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
