import {
    blogGetList,
    getRunningQueriesThunk,
    useBlogGetListQuery
} from '@/api/api'
import { store, wrapper } from '@/api/store'
import { range } from '@/functions/helpers'
import { skipToken } from '@reduxjs/toolkit/query'
import { GetStaticProps } from 'next'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/dist/client/router'
import React from 'react'

import BlogPage, { postPerPage } from '@/components/blog-page'

export const getStaticPaths = async () => {
    const storeObject = store()
    const result = await storeObject.dispatch(
        blogGetList.initiate({ limit: postPerPage, offset: 0 })
    )

    const totalPages = Math.ceil((result?.data?.total || 0) / postPerPage)

    return {
        fallback: false,
        paths: range(1, totalPages).map((page) => `/blog/${page}`)
    }
}

// getStaticProps
export const getServerSideProps: GetStaticProps = wrapper.getStaticProps(
    (store) => async (context) => {
        const page = context.params?.page

        if (typeof page === 'string') {
            store.dispatch(
                blogGetList.initiate({
                    limit: postPerPage,
                    offset: ((Number(page) || 1) - 1) * postPerPage
                })
            )
        }

        await Promise.all(store.dispatch(getRunningQueriesThunk()))

        return {
            props: {}
        }
    }
)

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
            <NextSeo title={`Блог обсерватории - Страница ${currentPage}`} />
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
