import React from 'react'
import { GetServerSidePropsResult, NextPage } from 'next'

import { API, SITE_LINK } from '@/api'
import { wrapper } from '@/api/store'

type SitemapDynamicPage = {
    link: string
    update: string
}

type SiteMapProps = object

const SitemapXml: NextPage<SiteMapProps> = () => <></>

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<SiteMapProps>> => {
            const { data } = await store.dispatch(API.endpoints.sitemapGetList.initiate())

            const staticPages = [
                'about',
                'objects',
                'photos',
                'stargazing',
                'starmap',
                'stargazing/faq',
                'stargazing/howto',
                'stargazing/rules',
                'stargazing/where',
                'observatory/overview',
                'observatory/weather'
            ]

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            const photosPages: SitemapDynamicPage[] =
                data?.photos?.map((item) => ({
                    link: `photos/${item.id}`,
                    update: new Date(item.updated?.date || new Date()).toISOString()
                })) || []

            const objectsPages: SitemapDynamicPage[] =
                data?.objects?.map((item) => ({
                    link: `objects/${item.id}`,
                    update: new Date(item.updated?.date || new Date()).toISOString()
                })) || []

            const eventsPages: SitemapDynamicPage[] =
                data?.objects?.map((item) => ({
                    link: `stargazing/${item.id}`,
                    update: new Date(item.updated?.date || new Date()).toISOString()
                })) || []

            let sitemap =
                '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'

            const makeUrlNode = (url: string, date: string, freq: 'monthly' | 'daily', priority: string = '1.0') => `
            <url>
              <loc>${SITE_LINK}${url}</loc>
              <lastmod>${date}</lastmod>
              <changefreq>${freq}</changefreq>
              <priority>${priority}</priority>
            </url>
          `

            // Static RU Locale
            sitemap += staticPages.map((url) => makeUrlNode(url, new Date().toISOString(), 'monthly', '0.8')).join('')

            // Static EN Locale
            sitemap += staticPages
                .map((url) => makeUrlNode('en/' + url, new Date().toISOString(), 'monthly', '0.8'))
                .join('')

            // Dynamic RU Locale
            sitemap += [...photosPages, ...objectsPages, ...eventsPages]
                .map((page) => makeUrlNode(page.link, page.update, 'daily'))
                .join('')

            // Dynamic EN Locale
            sitemap += [...photosPages, ...objectsPages, ...eventsPages]
                .map((page) => makeUrlNode('en/' + page.link, page.update, 'daily'))
                .join('')

            sitemap += '</urlset>'

            context.res.setHeader('Content-Type', 'text/xml')
            context.res.write(sitemap)
            context.res.end()

            return {
                props: {}
            }
        }
)

export default SitemapXml
