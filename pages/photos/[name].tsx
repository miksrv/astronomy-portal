import {store} from "@/api/store";
import {getCatalogList, getCatalogItem, useGetCatalogItemQuery, getRunningQueriesThunk} from "@/api/api";
import {wrapper} from "@/api/store";
import { useRouter } from "next/dist/client/router";
import { skipToken } from "@reduxjs/toolkit/query";
import {NextSeo} from "next-seo";

export async function getStaticPaths() {
    const storeObject = store();
    const result = await storeObject.dispatch(getCatalogList.initiate());

    return {
        paths: result.data?.payload.map((item) => `/objects/${item.name}`),
        fallback: true,
    };
}

export const getStaticProps = wrapper.getStaticProps(
    (store) => async (context) => {
        const name = context.params?.name;
        if (typeof name === "string") {
            store.dispatch(getCatalogItem.initiate(name));
        }

        await Promise.all(store.dispatch(getRunningQueriesThunk()));

        return {
            props: { object: {} },
        };
    }
);

export default function Photo() {
    const router = useRouter();
    const name = router.query.name;

    const result = useGetCatalogItemQuery(
        typeof name === "string" ? name : skipToken,
        {
            // If the page is not yet generated, router.isFallback will be true
            // initially until getStaticProps() finishes running
            skip: router.isFallback,
        }
    );
    const { isLoading, error, data } = result;

    return (
        <>
            <NextSeo
                title={data?.payload.title}
            />
            <article>
                {error ? (
                    <>Oh no, there was an error</>
                ) : router.isFallback || isLoading ? (
                    <>Loading...</>
                ) : data ? (
                    <>
                        <h3>{data.payload.title}</h3>
                        <div>{data.payload.category}</div>
                    </>
                ) : null}
            </article>
        </>
    );
}
