const { i18n } = require('./next-i18next.config.js')

/** @type {import('next').NextConfig} */
const nextConfig = {
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production'
    },
    // The public sitemap URL is "/sitemap" (see public/robots.txt), served by the
    // pages/api/sitemap.ts route handler. It can't live at pages/sitemap.tsx as a normal
    // page: Next.js reserves any route resolving to "/sitemap" as an App Router metadata
    // route and rejects `getServerSideProps` there, even under the Pages Router.
    async rewrites() {
        return [
            {
                source: '/sitemap',
                destination: '/api/sitemap'
            }
        ]
    },
    i18n,
    images: {
        remotePatterns: [
            {
                hostname: 'api.astro.miksoft.pro',
                port: '',
                protocol: 'https'
            },
            {
                hostname: 'astro.miksoft.pro',
                port: '',
                protocol: 'https'
            },
            {
                hostname: 'miksoft.pro',
                port: '',
                protocol: 'https'
            },
            {
                hostname: 'localhost',
                port: '8080',
                protocol: 'http'
            }
        ],
        // unoptimized - When true, the source image will be served as-is instead of changing quality,
        // size, or format. Defaults to false.
        unoptimized: false,
        // Source filenames are content-stable (timestamp+hash, e.g. "1724643303_651fa9ed48a44cf1cd38_preview.jpg")
        // and never get overwritten in place - a new upload always gets a new filename. So the resulting
        // /_next/image URL for a given photo+size never changes either, and it's safe to cache it far longer
        // than the Next.js default of 4h (14400s). This reduces how often crawlers (e.g. Yandex) and CDNs
        // re-fetch the same optimized image, and survives our on-disk optimizer cache being wiped on every
        // VPS redeploy without extra origin load.
        minimumCacheTTL: 31536000 // 1 year
    },
    output: 'standalone',
    reactStrictMode: true,
    // d3/celestial.min.js are plain <Script src="/scripts/..."> tags loaded in pages/_app.tsx -
    // static public assets, never bundled by webpack/Turbopack, so they don't belong here.
    // Only actual npm packages that ship untranspiled ESM need to be listed.
    transpilePackages: ['echarts-for-react', 'echarts']
}

module.exports = nextConfig
