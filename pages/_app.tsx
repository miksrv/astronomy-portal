import type { AppProps } from 'next/app'
import { Provider } from 'react-redux'
import {wrapper} from '@/api/store'
import { Montserrat } from 'next/font/google'
import Header from '@/components/header'
import Footer from "@/components/footer";
import {Container} from "semantic-ui-react";

import '@/styles/globals.sass'
import 'semantic-ui-css/semantic.min.css'
import React from "react";

export const montserrat = Montserrat({ subsets: ['latin'] })
export function App({ Component, pageProps }: AppProps) {
    const {store, props} = wrapper.useWrappedStore(pageProps);

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

export default App;
