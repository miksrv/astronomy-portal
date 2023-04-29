import {
    useBlogGetListQuery // getRunningQueriesThunk,
} from '@/api/api'
import { skipToken } from '@reduxjs/toolkit/query'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/dist/client/router'
import React from 'react'

import BlogPage, { postPerPage } from '@/components/blog-page'

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
    const router = useRouter()
    const routerObject = router.query.page
    const pageNumber =
        typeof routerObject === 'string' ? routerObject : skipToken

    const currentPage = typeof pageNumber === 'string' ? Number(pageNumber) : 1

    const { data, isLoading } = useBlogGetListQuery(
        {
            limit: postPerPage,
            offset: ((currentPage || 1) - 1) * postPerPage
        },
        {
            skip: router.isFallback || typeof routerObject !== 'string'
        }
    )

    return (
        <main>
            <NextSeo title={'Новости самодельной обсерватории'} />
            <BlogPage
                page={currentPage}
                loading={isLoading}
                posts={data?.items}
                total={data?.total}
            />
        </main>
    )
}

export default Blog
