/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['observatory.miksoft.pro'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'observatory.miksoft.pro',
        port: '',
        pathname: '/api/**',
      },
    ],
  },
}

module.exports = nextConfig
