import { wrapper } from '@/api/store'
import '@/styles/globals.sass'
import type { AppProps } from 'next/app'
import { Montserrat } from 'next/font/google'
import React from 'react'
import { Provider } from 'react-redux'
import 'semantic-ui-css/semantic.min.css'
import { Container } from 'semantic-ui-react'

import Footer from '@/components/footer'
import Header from '@/components/header'

export const montserrat = Montserrat({ subsets: ['latin'] })
export function App({ Component, pageProps }: AppProps) {
    const { store, props } = wrapper.useWrappedStore(pageProps)

    return (
        <Provider store={store}>
            <main className={montserrat.className}>
                <Header />
                <Container className='main'>
                    <Component {...props.pageProps} />
                </Container>
                <Footer />
            </main>
        </Provider>
    )
}

export default App
