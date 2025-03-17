const { i18n } = require('./next-i18next.config.js')

/** @type {import('next').NextConfig} */
const nextConfig = {
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production'
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
        unoptimized: false
    },
    output: 'standalone',
    reactStrictMode: true,
    transpilePackages: [
        '/scripts/d3.min.js',
        '/scripts/d3.geo.projection.min.js',
        '/scripts/celestial.min.js',
        '@/components/celestial-map',
        'echarts-for-react',
        'echarts'
    ],

    webpack(config) {
        config.resolve.fallback = {
            // if you miss it, all the other options in fallback, specified
            // by next.js will be dropped.
            ...config.resolve.fallback,

            fs: false // the solution
        }

        return config
    }
}

module.exports = nextConfig
