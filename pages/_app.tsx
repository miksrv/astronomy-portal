import type { AppProps } from 'next/app'
import { Provider } from 'react-redux'
import {wrapper} from '@/api/store'
import { Montserrat } from 'next/font/google'
import Header from '@/components/header/header'
import Footer from "@/components/footer/footer";

import '@/styles/globals.sass'

const montserrat = Montserrat({ subsets: ['latin'] })
export function App({ Component, pageProps }: AppProps) {
    const {store, props} = wrapper.useWrappedStore(pageProps);

    return (
        <Provider store={store}>
            <main className={montserrat.className}>
                <Header />
                <Component {...props.pageProps} />
                <Footer />
            </main>
        </Provider>
    )
}

export default App;
