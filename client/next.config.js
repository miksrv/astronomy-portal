/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['observatory.miksoft.pro'],
        remotePatterns: [
            {
                hostname: 'observatory.miksoft.pro',
                pathname: '/api/**',
                port: '',
                protocol: 'https'
            }
        ]
    },
    reactStrictMode: true
}

module.exports = nextConfig
