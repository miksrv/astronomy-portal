/** @type {import('next').NextConfig} */
const nextConfig = {
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production'
    },
    images: {
        domains: ['astro.miksoft.pro'],
        remotePatterns: [
            {
                hostname: 'astro.miksoft.pro',
                pathname: '/api/**',
                port: '',
                protocol: 'https'
            }
        ],
        // unoptimized - When true, the source image will be served as-is instead of changing quality,
        // size, or format. Defaults to false.
        unoptimized: true
    },
    output: 'standalone',
    reactStrictMode: true,
    transpilePackages: [
        '/scripts/d3.min.js',
        '/scripts/d3.geo.projection.min.js',
        '/scripts/celestial.min.js',
        '@/components/celestial-map',
        'recharts'
    ]
}

module.exports = nextConfig
