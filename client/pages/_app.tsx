import { wrapper } from '@/api/store'
import '@/styles/globals.sass'
import 'moment/locale/ru'
import type { AppProps } from 'next/app'
import { Montserrat } from 'next/font/google'
import NextNProgress from 'nextjs-progressbar'
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
            <main className={montserrat.className}>
                <NextNProgress
                    color={'#fbbd08'}
                    options={{ showSpinner: false }}
                />
                <Sidebar />
                <Header />
                <Container className={'rootContainer'}>
                    <Component {...props.pageProps} />
                </Container>
                <Footer />
            </main>
        </Provider>
    )
}

export default App
