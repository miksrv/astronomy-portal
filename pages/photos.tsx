import Head from 'next/head'
import { Inter } from 'next/font/google'
import {
    useGetCatalogListQuery,
    getCatalogList,
    getRunningQueriesThunk,
} from "@/api/api";
import Link from "next/link";
import {wrapper} from "@/api/store";
import {NextSeo} from "next-seo";

const inter = Inter({ subsets: ['latin'] })

export const getStaticProps = wrapper.getStaticProps(
    (store) => async (context) => {
        store.dispatch(getCatalogList.initiate());

        await Promise.all(store.dispatch(getRunningQueriesThunk()));

        return {
            props: { object: {} },
        };
    }
);

export default function Objects() {
    const { isLoading, error, data } = useGetCatalogListQuery();

    return (
        <>
            <NextSeo
                title='Список фотографий'
            />
            <main>
                Список объектов
                <ul>
                {data && data.payload.map((item) => (
                    <li key={item.name}>
                        <Link href={`/photos/${item.name}`} title={item.category}>{item.title || item.name}</Link>
                    </li>
                ))}
                </ul>
            </main>
        </>
    )
}
