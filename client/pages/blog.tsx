import {
    blogGetList,
    getRunningQueriesThunk,
    useBlogGetListQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { NextSeo } from 'next-seo'
import React from 'react'

import BlogPage, { postPerPage } from '@/components/blog-page'

// getStaticProps
export const getServerSideProps = wrapper.getStaticProps(
    (store) => async () => {
        store.dispatch(blogGetList.initiate({ limit: postPerPage, offset: 0 }))

        await Promise.all(store.dispatch(getRunningQueriesThunk()))

        return {
            props: { object: {} }
        }
    }
)

const Blog: React.FC = () => {
    const { data, isLoading } = useBlogGetListQuery({
        limit: postPerPage,
        offset: 0
    })

    return (
        <main>
            <NextSeo title={'Блог обсерватории'} />
            <BlogPage
                page={1}
                loading={isLoading}
                posts={data?.items}
                total={data?.total}
            />
        </main>
    )
}

export default Blog
