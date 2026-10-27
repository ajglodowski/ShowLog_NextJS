const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  })

/** @type {import('next').NextConfig} */
const nextConfig = {
    // `npm run dev:prod` serves on this host so the browser sends it the production
    // session cookie (set on .showlog.tv). It resolves to 127.0.0.1 through /etc/hosts.
    allowedDevOrigins: ['local.showlog.tv'],
    async headers() {
        return [
            {
                // matching all API routes
                source: "/app/components/show/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "*" }, // replace this your actual origin
                    { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
                    { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
                ]
            }
        ]
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.vercel.app'
            },
            {
                protocol: 'https',
                hostname: 'assets.showlog.tv',
            },
            {
                protocol: 'https',
                hostname: 'avatars.showlog.tv',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
            },
        ],
        minimumCacheTTL: 60 * 60 * 24 * 1, // 1 day
    },
    experimental: {
        //ppr: true,
        //dynamicIO: true,
        useCache: true,
        staleTimes: {
            dynamic: 30,  // Cache client-side navigations to dynamic pages for 30 seconds
            static: 180,  // Cache client-side navigations to static pages for 3 minutes
        },
    }
}

module.exports = withBundleAnalyzer(nextConfig);
