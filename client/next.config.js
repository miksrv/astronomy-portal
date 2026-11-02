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
            // DSS2 cut-outs of the sky for objects without a photo of our own (utils/skySurvey.ts)
            {
                hostname: 'skyview.gsfc.nasa.gov',
                pathname: '/current/cgi/runquery.pl',
                port: '',
                protocol: 'https'
            },
            // Local backend (composer serve) - dev-only, kept out of production builds.
            ...(process.env.NODE_ENV !== 'production'
                ? [
                      {
                          hostname: 'localhost',
                          port: '8080',
                          protocol: 'http'
                      }
                  ]
                : [])
        ],
        // unoptimized - When true, the source image will be served as-is instead of changing quality,
        // size, or format. Defaults to false.
        unoptimized: false,
        // Source filenames are content-stable (timestamp+hash, e.g. "1724643303_651fa9ed48a44cf1cd38_preview.jpg")
        // and never get overwritten in place - a new upload always gets a new filename. So the resulting
        // /_next/image URL for a given photo+size never changes either, and it's safe to cache it far longer
        // than the Next.js default of 4h (14400s). This reduces how often crawlers (e.g. Yandex) and CDNs
        // re-fetch the same optimized image.
        //
        // Not a year, though: when sharp fails (see imgOptTimeoutInSeconds below) Next silently serves
        // the ORIGINAL file and caches that for this same TTL, retrying only after it expires. A year of
        // that turned every photo into a multi-megabyte pass-through on the VPS (found in 4.15.1).
        // 30 days keeps crawler re-fetches rare and lets a bad entry heal; nginx keeps its own copy
        // for 7 days on top (config/nginx.conf).
        minimumCacheTTL: 2592000 // 30 days
    },
    experimental: {
        // sharp's time limit per image. The default 7 s is for a server with spare cores: on the
        // 1-CPU VPS a crawler fetching a dozen sizes of multi-megapixel astrophotos at once queues
        // them behind each other, the limit trips, and Next serves (and caches) the unoptimized
        // original. Verified on the host: the same pipeline takes ~0.2 s when the CPU is free.
        imgOptTimeoutInSeconds: 30
    },
    output: 'standalone',
    reactStrictMode: true,
    // d3/celestial.min.js are plain <Script src="/scripts/..."> tags loaded in pages/_app.tsx -
    // static public assets, never bundled by webpack/Turbopack, so they don't belong here.
    // Only actual npm packages that ship untranspiled ESM need to be listed.
    transpilePackages: ['echarts-for-react', 'echarts']
}

module.exports = nextConfig
