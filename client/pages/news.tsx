import {
    getNewsList,
    getRunningQueriesThunk,
    useGetNewsListQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { TNews } from '@/api/types'
import { NextSeo } from 'next-seo'
import React, { useEffect, useState } from 'react'
import { Button } from 'semantic-ui-react'

import NewsList from '@/components/news-list'

export const getStaticProps = wrapper.getStaticProps((store) => async () => {
    store.dispatch(getNewsList.initiate({ limit: 4, offset: 0 }))

    await Promise.all(store.dispatch(getRunningQueriesThunk()))

    return {
        props: { object: {} }
    }
})
const News: React.FC = () => {
    const [offset, setOffset] = useState<number>(0)
    const [news, addNews] = useState<TNews[]>([])
    const limit = 4

    const { data, isLoading, isFetching } = useGetNewsListQuery({
        limit,
        offset
    })

    useEffect(() => {
        if (data?.payload.news) {
            addNews((news) => news.concat(data?.payload.news))
        }
    }, [data])

    return (
        <main>
            <NextSeo
                title={'Новости самодельной обсерватории'}
                description={data?.payload.news[0].text
                    .replace(/(\r\n|\n|\r)/gm, '')
                    .slice(0, 200)}
                openGraph={{
                    locale: 'ru'
                }}
            />
            <NewsList
                loader={isLoading}
                news={offset > 0 ? news : data?.payload.news}
            />
            <br />
            <Button
                fluid
                color={'green'}
                onClick={() => setOffset(offset + limit)}
                disabled={isFetching} // #TODO news.length >= data?.payload.count ||
                loading={isFetching}
            >
                Загрузить еще
            </Button>
        </main>
    )
}

export default News
