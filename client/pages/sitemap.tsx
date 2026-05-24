import React from 'react'

import fs from 'fs'
import path from 'path'

import { GetServerSidePropsResult, NextPage } from 'next'

import { API, SITE_LINK, wrapper } from '@/api'
import { HistoryChapterMeta } from '@/data/history'

type DynamicPage = {
    link: string
    lastmod: string
}

type StaticPage = {
    url: string
    priority: string
    changefreq: string
    lastmod?: string
}

const Sitemap: NextPage<object> = () => <></>

const MANIFEST_PATH = path.join(process.cwd(), 'content/history/manifest.json')

const base = (SITE_LINK ?? '').replace(/\/$/, '')

const makeUrl = (ruPath: string, enPath: string, lastmod: string, changefreq: string, priority: string) => `
<url>
  <loc>${base}/${ruPath}</loc>
  <lastmod>${lastmod}</lastmod>
  <changefreq>${changefreq}</changefreq>
  <priority>${priority}</priority>
  <xhtml:link rel="alternate" hreflang="ru" href="${base}/${ruPath}"/>
  <xhtml:link rel="alternate" hreflang="en" href="${base}/${enPath}"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="${base}/${ruPath}"/>
</url>`

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const { data } = await store.dispatch(API.endpoints.sitemapGetList.initiate())
            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            let historyChapters: HistoryChapterMeta[] = []
            try {
                historyChapters = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
            } catch {}

            const today = new Date().toISOString()

            const staticPages: StaticPage[] = [
                { url: '', priority: '1.0', changefreq: 'daily', lastmod: today },
                { url: 'stargazing', priority: '1.0', changefreq: 'daily', lastmod: today },
                { url: 'photos', priority: '0.9', changefreq: 'weekly', lastmod: today },
                { url: 'objects', priority: '0.9', changefreq: 'weekly', lastmod: today },
                { url: 'stargazing/history', priority: '0.8', changefreq: 'weekly', lastmod: today },
                { url: 'about', priority: '0.7', changefreq: 'monthly', lastmod: '2025-01-01T00:00:00.000Z' },
                {
                    url: 'stargazing/howto',
                    priority: '0.7',
                    changefreq: 'monthly',
                    lastmod: '2025-01-01T00:00:00.000Z'
                },
                { url: 'stargazing/faq', priority: '0.7', changefreq: 'monthly', lastmod: '2025-01-01T00:00:00.000Z' },
                {
                    url: 'stargazing/rules',
                    priority: '0.7',
                    changefreq: 'monthly',
                    lastmod: '2025-01-01T00:00:00.000Z'
                },
                {
                    url: 'stargazing/where',
                    priority: '0.6',
                    changefreq: 'monthly',
                    lastmod: '2025-01-01T00:00:00.000Z'
                },
                { url: 'observatory', priority: '0.7', changefreq: 'weekly', lastmod: today },
                {
                    url: 'observatory/overview',
                    priority: '0.7',
                    changefreq: 'monthly',
                    lastmod: '2025-01-01T00:00:00.000Z'
                },
                {
                    url: 'observatory/history',
                    priority: '0.6',
                    changefreq: 'monthly',
                    lastmod: '2025-01-01T00:00:00.000Z'
                },
                { url: 'observatory/weather', priority: '0.5', changefreq: 'always', lastmod: today },
                { url: 'starmap', priority: '0.6', changefreq: 'monthly', lastmod: '2025-01-01T00:00:00.000Z' }
            ]

            const historyPages: StaticPage[] = historyChapters.map((chapter) => ({
                url: `observatory/history/${chapter.slug}`,
                priority: '0.6',
                changefreq: 'monthly',
                lastmod: new Date(`${chapter.date}-01`).toISOString()
            }))

            const photosPages: DynamicPage[] =
                data?.photos?.map((item) => ({
                    link: `photos/${item.id}`,
                    lastmod: new Date(item.updated?.date || new Date()).toISOString()
                })) || []

            const objectsPages: DynamicPage[] =
                data?.objects?.map((item) => ({
                    link: `objects/${item.id}`,
                    lastmod: new Date(item.updated?.date || new Date()).toISOString()
                })) || []

            const eventsPages: DynamicPage[] =
                data?.events?.map((item) => ({
                    link: `stargazing/${item.id}`,
                    lastmod: new Date(item.updated?.date || new Date()).toISOString()
                })) || []

            let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`

            for (const page of [...staticPages, ...historyPages]) {
                sitemap += makeUrl(page.url, `en/${page.url}`, page.lastmod ?? today, page.changefreq, page.priority)
            }

            for (const page of [...photosPages, ...objectsPages, ...eventsPages]) {
                sitemap += makeUrl(page.link, `en/${page.link}`, page.lastmod, 'weekly', '0.7')
            }

            sitemap += '\n</urlset>'

            context.res.setHeader('Content-Type', 'text/xml; charset=utf-8')
            context.res.write(sitemap)
            context.res.end()

            return { props: {} }
        }
)

export default Sitemap
