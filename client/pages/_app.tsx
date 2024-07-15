import { wrapper } from '@/api/store'
import '@/styles/globals.sass'
import '@/styles/theme.css'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import type { AppProps } from 'next/app'
import NextNProgress from 'nextjs-progressbar'
import React from 'react'
import 'react-image-lightbox/style.css'
import { Provider } from 'react-redux'
import 'semantic-ui-css/semantic.min.css'
import { Container } from 'semantic-ui-react'

import Footer from '@/components/footer'
import Header from '@/components/header'
import Sidebar from '@/components/sidebar'

dayjs.locale('ru')
dayjs.extend(utc)
dayjs.extend(relativeTime)

const App = ({ Component, pageProps }: AppProps) => {
    const { store } = wrapper.useWrappedStore(pageProps)

    return (
        <Provider store={store}>
            <main>
                <NextNProgress
                    color={'#fbbd08'}
                    options={{ showSpinner: false }}
                />
                <Sidebar />
                <Header />
                <Container className={'rootContainer'}>
                    <Component {...pageProps} />
                </Container>
                <Footer />
            </main>
        </Provider>
    )
}

export default App
