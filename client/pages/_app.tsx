import { wrapper } from '@/api/store'
import '@/styles/globals.sass'
import type { AppProps } from 'next/app'
import { Montserrat } from 'next/font/google'
import Script from 'next/script'
import React from 'react'
import 'react-image-lightbox/style.css'
import { Provider } from 'react-redux'
import 'semantic-ui-css/semantic.min.css'
import { Container } from 'semantic-ui-react'

import Footer from '@/components/footer'
import Header from '@/components/header'
import Sidebar from '@/components/sidebar'

export const montserrat = Montserrat({ subsets: ['latin'] })
export function App({ Component, pageProps }: AppProps) {
    const { store, props } = wrapper.useWrappedStore(pageProps)

    return (
        <Provider store={store}>
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
            <main className={montserrat.className}>
                <Sidebar />
                <Header />
                <Container className='rootContainer'>
                    <Component {...props.pageProps} />
                </Container>
                <Footer />
            </main>
        </Provider>
    )
}

export default App
