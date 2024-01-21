import { blogGetList, getRunningQueriesThunk } from '@/api/api'
import { wrapper } from '@/api/store'
import { TBlog } from '@/api/types'
import { sliceText } from '@/functions/helpers'
import { GetServerSidePropsResult, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React from 'react'

import BlogPage from '@/components/blog-page'
import { getMediaFromPost, postPerPage } from '@/components/blog-page/BlogPage'

interface BlogPageProps {
    blogItems: TBlog[]
    blogTotal: number
}

const Blog: NextPage<BlogPageProps> = ({ blogItems, blogTotal }) => (
    <main>
        <NextSeo
            title={'Астрономический блог'}
            description={sliceText(blogItems?.[0]?.text ?? '', 200)}
            openGraph={{
                images: getMediaFromPost(blogItems?.[0]),
                locale: 'ru'
            }}
        />
        <BlogPage
            page={1}
            posts={blogItems}
            total={blogTotal}
        />
    </main>
)

export const getServerSideProps = wrapper.getServerSideProps(
    (store) => async (): Promise<GetServerSidePropsResult<BlogPageProps>> => {
        const { data } = await store.dispatch(
            blogGetList.initiate({
                limit: postPerPage,
                offset: 0
            })
        )

        await Promise.all(store.dispatch(getRunningQueriesThunk()))

        return {
            props: {
                blogItems: data?.items || [],
                blogTotal: data?.total || 0
            }
        }
    }
)

export default Blog
