import {
    blogGetList,
    getRunningQueriesThunk,
    useBlogGetListQuery
} from '@/api/api'
import { wrapper } from '@/api/store'
import { sliceText } from '@/functions/helpers'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React from 'react'

import BlogPage, { getMediaFromPost, postPerPage } from '@/components/blog-page'

export const getServerSideProps = wrapper.getServerSideProps(
    (store) => async () => {
        store.dispatch(blogGetList.initiate({ limit: postPerPage, offset: 0 }))

        await Promise.all(store.dispatch(getRunningQueriesThunk()))

        return {
            props: { object: {} }
        }
    }
)

const Blog: NextPage = () => {
    const { data, isLoading } = useBlogGetListQuery({
        limit: postPerPage,
        offset: 0
    })

    return (
        <main>
            <NextSeo
                title={'Астрономический блог'}
                description={sliceText(data?.items?.[0]?.text ?? '', 200)}
                openGraph={{
                    images: getMediaFromPost(data?.items?.[0]),
                    locale: 'ru'
                }}
            />
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
