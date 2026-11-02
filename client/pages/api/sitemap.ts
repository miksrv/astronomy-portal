import { NextApiRequest, NextApiResponse } from 'next'

import { API, SITE_LINK } from '@/api'
import { makeStore } from '@/api/store'

// Plain API route (not a `pages/` page) on purpose: Next.js treats any page whose route
// resolves to "/sitemap" as a reserved App Router metadata route and rejects
// `getServerSideProps` in it, even under the Pages Router (see next.config.js rewrite that
// maps the public "/sitemap" URL to this handler).

type DynamicPage = {
    link: string
    lastmod?: string
}

type StaticPage = {
    url: string
    priority: string
    changefreq: string
    // Only for pages whose content has a real "last edited" date (the hand-written
    // ones). A list page changes whenever its newest item does, which a crawler
    // learns from the items themselves; a fake "now" would only teach it to
    // distrust every lastmod in the file.
    lastmod?: string
}

const base = (SITE_LINK ?? '').replace(/\/$/, '')

const toIsoDate = (date?: string): string | undefined => {
    const parsed = date ? new Date(date) : undefined

    return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : undefined
}

const makeUrl = (ruPath: string, enPath: string, changefreq: string, priority: string, lastmod?: string) => `
<url>
  <loc>${base}/${ruPath}</loc>${lastmod ? `\n  <lastmod>${lastmod}</lastmod>` : ''}
  <changefreq>${changefreq}</changefreq>
  <priority>${priority}</priority>
  <xhtml:link rel="alternate" hreflang="ru" href="${base}/${ruPath}"/>
  <xhtml:link rel="alternate" hreflang="en" href="${base}/${enPath}"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="${base}/${ruPath}"/>
</url>`

const CONTENT_PAGES_EDITED = '2025-01-01T00:00:00.000Z'

const staticPages: StaticPage[] = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: 'stargazing', priority: '1.0', changefreq: 'daily' },
    { url: 'photos', priority: '0.9', changefreq: 'weekly' },
    { url: 'objects', priority: '0.9', changefreq: 'weekly' },
    { url: 'stargazing/history', priority: '0.8', changefreq: 'weekly' },
    { url: 'about', priority: '0.7', changefreq: 'monthly', lastmod: CONTENT_PAGES_EDITED },
    { url: 'stargazing/howto', priority: '0.7', changefreq: 'monthly', lastmod: CONTENT_PAGES_EDITED },
    { url: 'stargazing/faq', priority: '0.7', changefreq: 'monthly', lastmod: CONTENT_PAGES_EDITED },
    { url: 'stargazing/rules', priority: '0.7', changefreq: 'monthly', lastmod: CONTENT_PAGES_EDITED },
    { url: 'stargazing/where', priority: '0.6', changefreq: 'monthly', lastmod: CONTENT_PAGES_EDITED },
    { url: 'observatory', priority: '0.7', changefreq: 'weekly' },
    { url: 'observatory/overview', priority: '0.7', changefreq: 'monthly', lastmod: CONTENT_PAGES_EDITED },
    // Section not yet ready for public access
    // { url: 'observatory/history', priority: '0.6', changefreq: 'monthly', lastmod: CONTENT_PAGES_EDITED },
    { url: 'observatory/weather', priority: '0.5', changefreq: 'always' },
    { url: 'starmap', priority: '0.9', changefreq: 'monthly', lastmod: '2026-10-29T00:00:00.000Z' }
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const store = makeStore()
    const { data } = await store.dispatch(API.endpoints.sitemapGetList.initiate())

    // A sitemap with the photos, objects and events missing would tell the crawler
    // those pages are gone: better to fail the request than to serve half a map
    if (!data) {
        res.setHeader('Cache-Control', 'no-store')
        res.status(503).send('Sitemap data is temporarily unavailable')

        return
    }

    const photosPages: DynamicPage[] = (data.photos ?? []).map((item) => ({
        link: `photos/${item.id}`,
        lastmod: toIsoDate(item.updated?.date)
    }))

    const objectsPages: DynamicPage[] = (data.objects ?? []).map((item) => ({
        link: `objects/${item.id}`,
        lastmod: toIsoDate(item.updated?.date)
    }))

    const eventsPages: DynamicPage[] = (data.events ?? []).map((item) => ({
        link: `stargazing/${item.id}`,
        lastmod: toIsoDate(item.updated?.date)
    }))

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`

    for (const page of staticPages) {
        sitemap += makeUrl(page.url, `en/${page.url}`, page.changefreq, page.priority, page.lastmod)
    }

    for (const page of [...photosPages, ...objectsPages, ...eventsPages]) {
        sitemap += makeUrl(page.link, `en/${page.link}`, 'weekly', '0.7', page.lastmod)
    }

    sitemap += '\n</urlset>'

    // Built from one API call per request otherwise; crawlers re-read it often
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.setHeader('Content-Type', 'text/xml; charset=utf-8')
    res.status(200).send(sitemap)
}
