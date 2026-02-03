/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/frontend',
                destination: '/',
            },
            {
                source: '/frontend/:path*',
                destination: '/:path*',
            },
        ];
    },
};

export default nextConfig;
