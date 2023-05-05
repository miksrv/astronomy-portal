/** @type {import('next').NextConfig} */
const nextConfig = {
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
    // output: 'standalone',
    reactStrictMode: true
}

module.exports = nextConfig
