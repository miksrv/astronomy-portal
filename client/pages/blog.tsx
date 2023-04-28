import {
    useBlogGetListQuery // getRunningQueriesThunk,
} from '@/api/api'
import { wrapper } from '@/api/store'
import { TBlog } from '@/api/types'
import { NextSeo } from 'next-seo'
import React, { useEffect, useState } from 'react'
import { Button } from 'semantic-ui-react'

import NewsList from '@/components/news-list'

// export const getStaticProps = wrapper.getStaticProps((store) => async () => {
//     store.dispatch(getNewsList.initiate({ limit: 4, offset: 0 }))
//
//     await Promise.all(store.dispatch(getRunningQueriesThunk()))
//
//     return {
//         props: { object: {} }
//     }
// })

const Blog: React.FC = () => {
    const [offset, setOffset] = useState<number>(0)
    const [news, addNews] = useState<TBlog[]>([])
    const limit = 10

    const { data, isLoading, isFetching } = useBlogGetListQuery({
        limit,
        offset
    })

    useEffect(() => {
        if (data?.items) {
            addNews((news) => news.concat(data.items))
        }
    }, [data])

    return (
        <main>
            <NextSeo title={'Новости самодельной обсерватории'} />
            <NewsList
                loader={isLoading}
                news={offset > 0 ? news : data?.items}
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

export default Blog
